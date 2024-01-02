import type { DependencyList } from 'react';
import { useRef } from 'react';
import depsAreSame from '../utils/depsAreSame';


// useCreation 是 useMemo 或 useRef 的替代品。
// 因为 useMemo 不能保证被 memo 的值一定不会被重计算，
// 而 useCreation 可以保证这一点。
// 而相比于 useRef，你可以使用 useCreation 创建一些常量，
// 这些常量和 useRef 创建出来的 ref 有很多使用场景上的相似，
// 但对于复杂常量的创建，useRef 却容易出现潜在的性能隐患。
// 实现原理是基于 useRef 再加一层判断.
// !如果依赖有变化，就重新计算.
export default function useCreation<T>(factory: () => T, deps: DependencyList) {
  const { current } = useRef({
    deps,
    obj: undefined as undefined | T,
    initialized: false,
  });
  if (current.initialized === false || !depsAreSame(current.deps, deps)) {
    current.deps = deps;
    current.obj = factory();
    current.initialized = true;
  }
  return current.obj as T;
}
