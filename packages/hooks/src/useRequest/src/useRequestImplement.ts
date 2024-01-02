import useCreation from '../../useCreation';
import useLatest from '../../useLatest';
import useMemoizedFn from '../../useMemoizedFn';
import useMount from '../../useMount';
import useUnmount from '../../useUnmount';
import useUpdate from '../../useUpdate';
import isDev from '../../utils/isDev';

import Fetch from './Fetch';
import type { Options, Plugin, Result, Service } from './types';

function useRequestImplement<TData, TParams extends any[]>(
  service: Service<TData, TParams>,
  options: Options<TData, TParams> = {},
  plugins: Plugin<TData, TParams>[] = [],
) {
  const { manual = false, ...rest } = options;

  if (isDev) {
    if (options.defaultParams && !Array.isArray(options.defaultParams)) {
      console.warn(`expected defaultParams is array, got ${typeof options.defaultParams}`);
    }
  }

  const fetchOptions = {
    manual,
    ...rest,
  };

  const serviceRef = useLatest(service);

  const update = useUpdate();

  // 保证请求实例都不会发生改变
  const fetchInstance = useCreation(() => {
    // 目前只有 useAutoRunPlugin 这个 plugin 有这个方法
    // 初始化状态，initState 值为 { loading: xxx }，代表是否 loading
    const initState = plugins.map((p) => p?.onInit?.(fetchOptions)).filter(Boolean);

    // !整个 useRequest 的核心代码，它处理了整个请求的生命周期。
    return new Fetch<TData, TParams>(
      serviceRef,
      fetchOptions,
      update,  // 更新组件
      Object.assign({}, ...initState),
    );
  }, []);

  fetchInstance.options = fetchOptions;

  // 执行所有的 plugin。每个 plugin 中都返回的方法，可以在特定时机执行。
  fetchInstance.pluginImpls = plugins.map((p) => p(fetchInstance, fetchOptions));

  useMount(() => {
    if (!manual) {
      // useCachePlugin can set fetchInstance.state.params from cache when init
      const params = fetchInstance.state.params || options.defaultParams || [];
      // @ts-ignore
      fetchInstance.run(...params);
    }
  });

  useUnmount(() => {
    fetchInstance.cancel();
  });

  return {
    loading: fetchInstance.state.loading,
    data: fetchInstance.state.data,
    error: fetchInstance.state.error,
    params: fetchInstance.state.params || [],

    cancel: useMemoizedFn(fetchInstance.cancel.bind(fetchInstance)),
    refresh: useMemoizedFn(fetchInstance.refresh.bind(fetchInstance)),
    refreshAsync: useMemoizedFn(fetchInstance.refreshAsync.bind(fetchInstance)),
    run: useMemoizedFn(fetchInstance.run.bind(fetchInstance)),
    runAsync: useMemoizedFn(fetchInstance.runAsync.bind(fetchInstance)),
    mutate: useMemoizedFn(fetchInstance.mutate.bind(fetchInstance)),
    
  } as Result<TData, TParams>;
}



export default useRequestImplement;


