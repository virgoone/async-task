import { useCallback, useEffect, useRef, useState } from "react";
import {
	createInitialState,
	deleteState,
	getState,
	isCacheValid,
	setState,
	subscribe,
} from "./store";
import type {
	AsyncState,
	UseAsyncTaskOptions,
	UseAsyncTaskResult,
} from "./types";

/**
 * 用于管理复杂异步任务的 React Hook
 *
 * @param action 要执行的异步函数
 * @param options 配置选项
 * @returns 包含状态和控制函数的对象
 *
 * @example
 * ```tsx
 * const { data, loading, error, execute } = useAsyncTask(
 *   async (userId: string) => fetchUser(userId),
 *   {
 *     taskKey: (id) => `user-${id}`,
 *     cacheTime: 30000,
 *     maxRetries: 3,
 *   }
 * )
 * ```
 */
export function useAsyncTask<Args extends any[], T, TError = unknown>(
	action: (...args: Args) => Promise<T>,
	options: UseAsyncTaskOptions<T, Args> = {},
): UseAsyncTaskResult<Args, T, TError> {
	const {
		immediate = false,
		dependencies = [],
		pollingInterval = 0,
		taskKey,
	} = options;

	// 本地状态
	const [localState, setLocalState] = useState<AsyncState<T, TError>>(() =>
		createInitialState(),
	);

	// 当前请求 ID（用于竞态控制）
	const requestIdRef = useRef(0);

	// 轮询定时器
	const pollingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// 是否已卸载
	const unmountedRef = useRef(false);

	// 存储最后执行的参数（用于重试和轮询）
	const lastArgsRef = useRef<Args | null>(null);

	// 当前使用的 taskKey
	const currentTaskKeyRef = useRef<string | null>(null);

	// 是否正在同步全局状态（避免循环更新）
	const isSyncingRef = useRef(false);

	// 存储 action 和 options 的引用（避免不必要的重新执行）
	const actionRef = useRef(action);
	const optionsRef = useRef(options);

	// 更新 refs
	useEffect(() => {
		actionRef.current = action;
		optionsRef.current = options;
	});

	/**
	 * 更新本地状态
	 */
	const updateLocalState = useCallback(
		(partial: Partial<AsyncState<T, TError>>) => {
			if (!unmountedRef.current && !isSyncingRef.current) {
				setLocalState((prev) => ({ ...prev, ...partial }));
			}
		},
		[],
	);

	/**
	 * 执行异步任务
	 */
	const execute = useCallback(
		async (...args: Args): Promise<T | void> => {
			const currentAction = actionRef.current;
			const currentOptions = optionsRef.current;

			// 更新最后执行的参数
			lastArgsRef.current = args;

			// 计算 taskKey
			const key = currentOptions.taskKey
				? typeof currentOptions.taskKey === "function"
					? currentOptions.taskKey(...args)
					: currentOptions.taskKey
				: null;
			currentTaskKeyRef.current = key;

			// 检查缓存
			if (key && currentOptions.cacheTime && currentOptions.cacheTime > 0) {
				const cachedState = getState<T, TError>(key);
				if (
					cachedState &&
					isCacheValid(cachedState, currentOptions.cacheTime)
				) {
					// 缓存有效，直接使用缓存数据
					updateLocalState({
						data: cachedState.data,
						loading: false,
						error: cachedState.error,
						retryCount: cachedState.retryCount,
						lastUpdated: cachedState.lastUpdated,
					});
					return cachedState.data as T;
				}
			}

			// 生成新的请求 ID
			const currentRequestId = ++requestIdRef.current;

			// 更新状态为 loading
			const loadingUpdate = { loading: true };
			updateLocalState(loadingUpdate);
			if (key) {
				const existing = getState<T, TError>(key);
				setState(key, {
					...(existing || createInitialState<T, TError>()),
					loading: true,
					requestId: currentRequestId,
				});
			}

			// 定义执行函数（用于重试）
			const performAction = async (retryCount = 0): Promise<T | void> => {
				try {
					const result = await currentAction(...args);

					// 检查请求是否已过期（竞态控制）
					if (
						unmountedRef.current ||
						currentRequestId !== requestIdRef.current
					) {
						return;
					}

					// 成功：更新状态
					const successState: Partial<AsyncState<T, TError>> = {
						data: result,
						loading: false,
						error: null,
						retryCount: 0,
						lastUpdated: Date.now(),
					};

					updateLocalState(successState);
					if (key) {
						setState(key, {
							...successState,
							requestId: currentRequestId,
						} as any);
					}

					return result;
				} catch (err) {
					// 检查请求是否已过期
					if (
						unmountedRef.current ||
						currentRequestId !== requestIdRef.current
					) {
						return;
					}

					// 判断是否需要重试
					const maxRetries = currentOptions.maxRetries || 0;
					if (retryCount < maxRetries) {
						// 更新重试次数
						updateLocalState({ retryCount: retryCount + 1 });
						// 重试
						return performAction(retryCount + 1);
					}

					// 失败：更新错误状态
					const errorState: Partial<AsyncState<T, TError>> = {
						loading: false,
						error: err as TError,
						retryCount,
						lastUpdated: Date.now(),
					};

					updateLocalState(errorState);
					if (key) {
						setState(key, {
							...errorState,
							requestId: currentRequestId,
						} as any);
					}
				}
			};

			return performAction();
		},
		[updateLocalState],
	);

	/**
	 * 取消当前任务
	 */
	const cancel = useCallback(() => {
		// 增加请求 ID，使当前请求失效
		requestIdRef.current++;
		// 清除轮询
		if (pollingTimerRef.current) {
			clearTimeout(pollingTimerRef.current);
			pollingTimerRef.current = null;
		}
	}, []);

	/**
	 * 重置状态
	 */
	const reset = useCallback(() => {
		cancel();

		const key = currentTaskKeyRef.current;
		if (key) {
			// 清除全局状态和缓存
			deleteState(key);
		}

		// 重置本地状态
		if (!unmountedRef.current) {
			setLocalState(createInitialState<T, TError>());
		}
		lastArgsRef.current = null;
		currentTaskKeyRef.current = null;
	}, [cancel]);

	/**
	 * 订阅全局状态（如果有 taskKey）
	 */
	useEffect(() => {
		if (!taskKey) return;

		// 订阅状态变化
		const syncState = (state: AsyncState<T, TError>) => {
			if (!unmountedRef.current) {
				isSyncingRef.current = true;
				setLocalState(state);
				isSyncingRef.current = false;
			}
		};

		const unsubscribe = subscribe<T, TError>(
			typeof taskKey === "function" ? "__dynamic__" : taskKey,
			syncState,
		);

		return unsubscribe;
	}, [taskKey]);

	/**
	 * 处理 immediate - 仅在首次挂载时执行
	 */
	useEffect(() => {
		if (immediate) {
			execute(...([] as unknown as Args));
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [immediate]);

	/**
	 * 处理 dependencies 变化
	 * 注意：不要同时使用 immediate 和 dependencies
	 * 如果需要依赖变化触发，请在组件中使用 useEffect 手动调用 execute
	 */
	useEffect(() => {
		if (!immediate && dependencies.length > 0) {
			execute(...([] as unknown as Args));
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, dependencies);

	/**
	 * 处理轮询
	 */
	useEffect(() => {
		if (pollingInterval <= 0 || !immediate) {
			return;
		}

		const poll = async (): Promise<void> => {
			if (unmountedRef.current) return;

			const args = lastArgsRef.current || ([] as unknown as Args);
			await execute(...args);

			if (!unmountedRef.current && pollingInterval > 0) {
				pollingTimerRef.current = setTimeout(poll, pollingInterval);
			}
		};

		// 启动轮询（在首次执行完成后）
		pollingTimerRef.current = setTimeout(poll, pollingInterval);

		return () => {
			if (pollingTimerRef.current) {
				clearTimeout(pollingTimerRef.current);
				pollingTimerRef.current = null;
			}
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [immediate, pollingInterval]);

	/**
	 * 组件卸载时清理
	 */
	useEffect(() => {
		return () => {
			unmountedRef.current = true;
			if (pollingTimerRef.current) {
				clearTimeout(pollingTimerRef.current);
			}
		};
	}, []);

	return {
		...localState,
		execute,
		cancel,
		reset,
	};
}
