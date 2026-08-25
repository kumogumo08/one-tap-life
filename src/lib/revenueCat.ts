import { NativeModules, Platform, TurboModuleRegistry } from 'react-native';
import Purchases, {
  PURCHASES_ERROR_CODE,
  type CustomerInfo,
  type PurchasesError,
  type PurchasesOffering,
  type PurchasesPackage,
} from 'react-native-purchases';

/** RevenueCat Entitlement ID（ダッシュボードと一致） */
export const FAMILY_PACK_ENTITLEMENT_ID = 'family_pack';

/** App Store Product ID */
export const FAMILY_PACK_PRODUCT_ID = 'one_tap_life_family_pack';

/** Offering identifier */
const FAMILY_PACK_OFFERING_ID = 'default';

/** Package identifier（$rc_lifetime） */
const FAMILY_PACK_PACKAGE_ID = '$rc_lifetime';

type RevenueCatAccessUpdateHandler = (hasFamilyPack: boolean) => void;

let configured = false;
let configurePromise: Promise<void> | null = null;
let customerInfoListenerAttached = false;
let customerInfoUpdateListener: ((info: CustomerInfo) => void) | null = null;
let cachedHasFamilyPack = false;
let accessUpdateHandler: RevenueCatAccessUpdateHandler | null = null;

function getIosApiKey(): string | undefined {
  const key = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
  if (typeof key !== 'string') return undefined;
  const trimmed = key.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function logDev(message: string, detail?: unknown): void {
  if (!__DEV__) return;
  if (detail === undefined) {
    console.log(`[RevenueCat] ${message}`);
    return;
  }
  console.log(`[RevenueCat] ${message}`, detail);
}

/**
 * react-native-purchases の Native Module (RNPurchases) が実在するか。
 * Expo Go では通常存在しない。Development Build / Production では存在する。
 */
function hasRevenueCatNativeModule(): boolean {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return false;
  }

  if (NativeModules.RNPurchases != null) {
    return true;
  }

  try {
    const turbo = TurboModuleRegistry.get('RNPurchases');
    return turbo != null;
  } catch {
    return false;
  }
}

/** RevenueCat のネイティブ課金が使えるか */
export function isRevenueCatNativeAvailable(): boolean {
  return hasRevenueCatNativeModule();
}

export function getRevenueCatUnavailableMessage(): string | null {
  if (Platform.OS === 'web') {
    return 'Webでは購入できません';
  }
  if (!hasRevenueCatNativeModule()) {
    return '購入機能は開発ビルドまたは本番アプリで利用できます';
  }
  if (Platform.OS === 'ios' && !getIosApiKey()) {
    return '購入設定が未完了です';
  }
  if (Platform.OS === 'android') {
    // Android Public SDK Key は未設定。iOS実課金を優先実装
    return 'Androidの購入は準備中です';
  }
  return null;
}

export function customerInfoHasFamilyPack(info: CustomerInfo): boolean {
  return info.entitlements.active[FAMILY_PACK_ENTITLEMENT_ID] != null;
}

export function getCachedHasFamilyPack(): boolean {
  return cachedHasFamilyPack;
}

function setCachedHasFamilyPack(has: boolean): void {
  const changed = cachedHasFamilyPack !== has;
  cachedHasFamilyPack = has;
  if (changed && accessUpdateHandler) {
    accessUpdateHandler(has);
  }
}

/** characterAccess から所有状態更新を受け取る */
export function setRevenueCatAccessUpdateHandler(
  handler: RevenueCatAccessUpdateHandler | null
): void {
  accessUpdateHandler = handler;
}

function isPurchasesError(error: unknown): error is PurchasesError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'string' &&
    'message' in error
  );
}

export function isUserCancelledPurchase(error: unknown): boolean {
  if (!isPurchasesError(error)) return false;
  return error.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR;
}

function getErrorMessage(error: unknown): string {
  if (isPurchasesError(error)) return error.message;
  if (error instanceof Error) return error.message;
  return '不明なエラーが発生しました';
}

function attachCustomerInfoListenerOnce(): void {
  if (customerInfoListenerAttached) return;
  if (!isRevenueCatNativeAvailable()) return;

  customerInfoUpdateListener = (info: CustomerInfo) => {
    setCachedHasFamilyPack(customerInfoHasFamilyPack(info));
  };

  Purchases.addCustomerInfoUpdateListener(customerInfoUpdateListener);
  customerInfoListenerAttached = true;
}

/** アプリ終了時など、必要なら listener を外す */
export function detachCustomerInfoListener(): void {
  if (!customerInfoListenerAttached || !customerInfoUpdateListener) return;

  Purchases.removeCustomerInfoUpdateListener(customerInfoUpdateListener);
  customerInfoUpdateListener = null;
  customerInfoListenerAttached = false;
}

/**
 * RevenueCat SDK を1回だけ configure する。
 * Native Module が無い環境（Expo Go 等）では何もせず安全に戻る。
 */
export async function configureRevenueCat(): Promise<void> {
  if (configured) return;

  if (!configurePromise) {
    configurePromise = (async () => {
      if (!isRevenueCatNativeAvailable()) {
        logDev('configure skipped: native module unavailable');
        configured = true;
        return;
      }

      if (Platform.OS !== 'ios') {
        logDev('configure skipped: iOS only for now');
        configured = true;
        return;
      }

      const apiKey = getIosApiKey();
      if (!apiKey) {
        console.warn(
          '[RevenueCat] EXPO_PUBLIC_REVENUECAT_IOS_API_KEY が未設定です'
        );
        configured = true;
        return;
      }

      Purchases.configure({ apiKey });
      configured = true;
      attachCustomerInfoListenerOnce();
      logDev('configured');
    })();
  }

  await configurePromise;
}

export async function refreshCustomerInfo(): Promise<CustomerInfo | null> {
  await configureRevenueCat();

  if (!isRevenueCatNativeAvailable() || Platform.OS !== 'ios' || !getIosApiKey()) {
    setCachedHasFamilyPack(false);
    return null;
  }

  try {
    const info = await Purchases.getCustomerInfo();
    setCachedHasFamilyPack(customerInfoHasFamilyPack(info));
    return info;
  } catch (error) {
    console.warn('[RevenueCat] getCustomerInfo failed', error);
    setCachedHasFamilyPack(false);
    return null;
  }
}

function pickFamilyPackPackage(
  offering: PurchasesOffering
): PurchasesPackage | null {
  if (offering.lifetime) {
    return offering.lifetime;
  }

  const byPackageId = offering.availablePackages.find(
    (pkg) => pkg.identifier === FAMILY_PACK_PACKAGE_ID
  );
  if (byPackageId) return byPackageId;

  const byProductId = offering.availablePackages.find(
    (pkg) => pkg.product.identifier === FAMILY_PACK_PRODUCT_ID
  );
  return byProductId ?? null;
}

export async function getFamilyPackPackage(): Promise<PurchasesPackage | null> {
  await configureRevenueCat();

  const apiKey = getIosApiKey();
  if (!isRevenueCatNativeAvailable() || Platform.OS !== 'ios' || !apiKey) {
    return null;
  }

  try {
    const offerings = await Purchases.getOfferings();
    const offering =
      offerings.current ??
      offerings.all[FAMILY_PACK_OFFERING_ID] ??
      null;

    if (!offering) {
      logDev('offering not found (current / default)');
      return null;
    }

    const picked = pickFamilyPackPackage(offering);
    if (!picked) {
      logDev('family pack package not found in offering');
      return null;
    }

    logDev('family pack package ready', {
      packageIdentifier: picked.identifier,
      productIdentifier: picked.product.identifier,
      priceString: picked.product.priceString,
    });

    return picked;
  } catch (error) {
    console.warn('[RevenueCat] getOfferings failed', error);
    return null;
  }
}

export function getLocalizedPriceString(pkg: PurchasesPackage): string {
  return pkg.product.priceString;
}

export type PurchaseFamilyPackResult =
  | { status: 'success'; hasFamilyPack: boolean; customerInfo: CustomerInfo }
  | { status: 'cancelled' }
  | { status: 'unavailable'; message: string }
  | { status: 'error'; message: string };

export async function purchaseFamilyPack(): Promise<PurchaseFamilyPackResult> {
  const unavailable = getRevenueCatUnavailableMessage();
  if (unavailable) {
    return { status: 'unavailable', message: unavailable };
  }

  await configureRevenueCat();

  const pkg = await getFamilyPackPackage();
  if (!pkg) {
    return {
      status: 'unavailable',
      message: '商品情報を取得できませんでした',
    };
  }

  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const hasFamilyPack = customerInfoHasFamilyPack(customerInfo);
    setCachedHasFamilyPack(hasFamilyPack);
    return { status: 'success', hasFamilyPack, customerInfo };
  } catch (error) {
    if (isUserCancelledPurchase(error)) {
      return { status: 'cancelled' };
    }
    return { status: 'error', message: getErrorMessage(error) };
  }
}

export type RestoreFamilyPackResult =
  | { status: 'success'; hasFamilyPack: boolean; customerInfo: CustomerInfo }
  | { status: 'unavailable'; message: string }
  | { status: 'error'; message: string };

export async function restoreFamilyPackPurchases(): Promise<RestoreFamilyPackResult> {
  const unavailable = getRevenueCatUnavailableMessage();
  if (unavailable) {
    return { status: 'unavailable', message: unavailable };
  }

  await configureRevenueCat();

  try {
    const customerInfo = await Purchases.restorePurchases();
    const hasFamilyPack = customerInfoHasFamilyPack(customerInfo);
    setCachedHasFamilyPack(hasFamilyPack);
    return { status: 'success', hasFamilyPack, customerInfo };
  } catch (error) {
    return { status: 'error', message: getErrorMessage(error) };
  }
}
