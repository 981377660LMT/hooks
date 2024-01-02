/* eslint-disable @typescript-eslint/no-parameter-properties */

import { isFunction } from '../../utils';
import type { MutableRefObject } from 'react';
import type { FetchState, Options, PluginReturn, Service, Subscribe } from './types';

// !1.流程：状态机+插件执行(插件先进后出)
// !2.跨平台：这个Fetch是不与react强绑定的
// !3.插件：通过这样的方式，Fetch 类的代码会变得非常的精简，只需要完成整体流程的功能，所有额外的功能（比如重试、轮询等等）都交给插件去实现。
//  符合职责单一原则:一个 Plugin 只做一件事，相互之间不相关。整体的可维护性更高，并且拥有更好的可测试性。
//  这对于我们平时的组件/hook 封装很有帮助，我们对一个复杂功能的抽象，可以尽可能保证对外接口简单。
//  内部实现需要遵循单一职责的原则，通过类似插件化的机制，细化拆分组件，从而提升组件可维护性、可测试性。

export default class Fetch<TData, TParams extends any[]> {
  // 插件执行后返回的方法列表
  pluginImpls: PluginReturn<TData, TParams>[];

  // 版本号
  count: number = 0;

  state: FetchState<TData, TParams> = {
    loading: false,
    params: undefined,
    data: undefined,
    error: undefined,
  };

  constructor(
    public serviceRef: MutableRefObject<Service<TData, TParams>>,
    public options: Options<TData, TParams>,
    public subscribe: Subscribe,  // !外部传入的 forceUpdate，与react沟通的桥梁
    public initState: Partial<FetchState<TData, TParams>> = {},
  ) {
    this.state = {
      ...this.state,
      loading: !options.manual, // 非手动，就loading
      ...initState,
    };
  }

  setState(s: Partial<FetchState<TData, TParams>> = {}) {
    this.state = {
      ...this.state,
      ...s,
    };
    // 设置完成通过 subscribe 调用通知 useRequestImplement 组件重新渲染，从而获取最新值。
    // （所以这里状态更新的时候，都会导致组件重新渲染。）
    this.subscribe();
  }

  // 执行插件中的某个事件（event），rest 作为参数传入
  runPluginHandler(event: keyof PluginReturn<TData, TParams>, ...rest: any[]) {
    // @ts-ignore
    const r = this.pluginImpls.map((i) => i[event]?.(...rest)).filter(Boolean);
    return Object.assign({}, ...r);  // copy
  }

  async runAsync(...params: TParams): Promise<TData> {
    this.count += 1;
    const currentCount = this.count;

    const {
      stopNow = false,
      returnNow = false,
      ...state
    } = this.runPluginHandler('onBefore', params);
    // stop request
    if (stopNow) {
      return new Promise(() => {});
    }

    this.setState({
      loading: true,
      params,
      ...state,
    });

    // return now
    // 例如 useCachePlugin 如果还存于新鲜时间内，则不用请求，返回 returnNow，这样就会直接返回缓存的数据。
    if (returnNow) {
      return Promise.resolve(state.data);
    }

    this.options.onBefore?.(params);

    try {
      // replace service
      // 这个阶段只有 useCachePlugin 执行了 onRequest 方法，执行后返回 service Promise（有可能是缓存的结果），从而达到缓存 Promise 的效果。
      let { servicePromise } = this.runPluginHandler('onRequest', this.serviceRef.current, params);
      if (!servicePromise) {
        servicePromise = this.serviceRef.current(...params);
      }

      const res = await servicePromise;

      // !版本号不一致就必须忽略返回值(返回值已经脏了)
      if (currentCount !== this.count) {
        // prevent run.then when request is canceled
        return new Promise(() => {});
      }

      // const formattedResult = this.options.formatResultRef.current ? this.options.formatResultRef.current(res) : res;

      this.setState({
        data: res,
        error: undefined,
        loading: false,
      });

      this.options.onSuccess?.(res, params);
      this.runPluginHandler('onSuccess', res, params);

      this.options.onFinally?.(params, res, undefined);
      if (currentCount === this.count) {
        this.runPluginHandler('onFinally', params, res, undefined);
      }

      return res;
    } catch (error) {
      // !版本号不一致就必须忽略返回
      if (currentCount !== this.count) {
        // prevent run.then when request is canceled
        return new Promise(() => {});
      }

      this.setState({
        error,
        loading: false,
      });

      this.options.onError?.(error, params);
      this.runPluginHandler('onError', error, params);

      this.options.onFinally?.(params, undefined, error);
      if (currentCount === this.count) {
        this.runPluginHandler('onFinally', params, undefined, error);
      }

      throw error;
    }
  }

  run(...params: TParams) {
    this.runAsync(...params).catch((error) => {
      if (!this.options.onError) {
        console.error(error);
      }
    });
  }

  cancel() {
    this.count += 1;
    this.setState({
      loading: false,
    });

    this.runPluginHandler('onCancel');
  }

  refresh() {
    // @ts-ignore
    this.run(...(this.state.params || []));
  }

  refreshAsync() {
    // @ts-ignore
    return this.runAsync(...(this.state.params || []));
  }

  mutate(data?: TData | ((oldData?: TData) => TData | undefined)) {
    const targetData = isFunction(data) ? data(this.state.data) : data;
    this.runPluginHandler('onMutate', targetData);
    this.setState({
      data: targetData,
    });
  }
}
