import { useEffect, useState } from 'react';

import {
  getPackAccessVersion,
  subscribePackAccess,
} from '@/src/lib/characterAccess';

/** パック所有状態の変更で再描画するためのフック */
export function usePackAccessVersion(): number {
  const [version, setVersion] = useState(getPackAccessVersion);

  useEffect(() => {
    return subscribePackAccess(() => {
      setVersion(getPackAccessVersion());
    });
  }, []);

  return version;
}
