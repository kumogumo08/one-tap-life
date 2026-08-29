import {
  DEFAULT_NOTIFICATION_MESSAGE,
  NOTIFICATION_MESSAGES_BY_CHARACTER,
  getNotificationMessage,
  pickNotificationMessage,
} from '@/src/data/notificationMessages';
import { CHARACTER_IDS } from '@/src/types/character';
import type { CharacterId } from '@/src/types/character';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

function withMockedRandom<T>(value: number, fn: () => T): T {
  const original = Math.random;
  Math.random = () => value;
  try {
    return fn();
  } finally {
    Math.random = original;
  }
}

function run(): void {
  const registeredIds = CHARACTER_IDS.filter(
    (id) => (NOTIFICATION_MESSAGES_BY_CHARACTER[id]?.length ?? 0) > 0
  );

  assert(registeredIds.length > 0, 'registered characters exist');

  for (const id of registeredIds) {
    const pool = NOTIFICATION_MESSAGES_BY_CHARACTER[id] ?? [];
    const message = getNotificationMessage(id);
    assert(pool.includes(message), `${id} returns a dedicated message`);
  }

  const firstGal = withMockedRandom(0, () => getNotificationMessage('gal'));
  const lastGal = withMockedRandom(0.999, () => getNotificationMessage('gal'));
  const galPool = NOTIFICATION_MESSAGES_BY_CHARACTER.gal ?? [];
  assert(firstGal === galPool[0], 'random 0 picks first gal message');
  assert(lastGal === galPool[galPool.length - 1], 'random 0.999 picks last gal message');

  const unregisteredId = 'maid' as CharacterId;
  assert(
    getNotificationMessage(unregisteredId) === DEFAULT_NOTIFICATION_MESSAGE,
    'unregistered character returns default'
  );

  assert(
    pickNotificationMessage([]) === DEFAULT_NOTIFICATION_MESSAGE,
    'empty array returns default'
  );
  assert(
    pickNotificationMessage(undefined) === DEFAULT_NOTIFICATION_MESSAGE,
    'undefined returns default'
  );
  assert(
    pickNotificationMessage(null) === DEFAULT_NOTIFICATION_MESSAGE,
    'null returns default'
  );

  console.log('notificationMessages tests passed');
}

run();
