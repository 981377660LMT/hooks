import { useRef } from 'react';
import type { useEffect, useLayoutEffect } from 'react';

type EffectHookType = typeof useEffect | typeof useLayoutEffect;

// useUpdateEffect 和 useUpdateLayoutEffect 的用法跟 useEffect 和 useLayoutEffect 一样，只是会忽略首次执行，只在依赖更新时执行。
// !主要实现效果:在某个参数重新设置时，执行某个函数
export const createUpdateEffect: (hook: EffectHookType) => EffectHookType =
  (hook) => (effect, deps) => {
    const isMounted = useRef(false);

    // for react-refresh
    hook(() => {
      return () => {
        isMounted.current = false;
      };
    }, []);

    hook(() => {
      // 首次执行完时候，设置为 true，从而下次依赖更新的时候可以执行逻辑
      if (!isMounted.current) {
        isMounted.current = true;
      } else {
        return effect();
      }
    }, deps);
  };

export default createUpdateEffect;
