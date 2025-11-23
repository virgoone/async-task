import type { AsyncState, StateListener, TaskState } from "./types";

/**
 * 全局状态存储
 * 使用 Map 存储每个 taskKey 对应的状态
 */
const globalStore = new Map<string, TaskState>();

/**
 * 全局监听器存储
 * 每个 taskKey 可以有多个监听器（多个组件订阅同一个 task）
 */
const listeners = new Map<string, Set<StateListener>>();

/**
 * 获取指定 taskKey 的状态
 * @param key taskKey
 * @returns 状态对象，如果不存在则返回 null
 */
export function getState<T = any, TError = unknown>(
	key: string,
): TaskState<T, TError> | null {
	return (globalStore.get(key) as TaskState<T, TError>) || null;
}

/**
 * 设置指定 taskKey 的状态
 * @param key taskKey
 * @param state 新状态
 */
export function setState<T = any, TError = unknown>(
	key: string,
	state: TaskState<T, TError>,
): void {
	globalStore.set(key, state);
	notifyListeners(key, state);
}

/**
 * 更新指定 taskKey 的部分状态
 * @param key taskKey
 * @param partial 要更新的部分状态
 */
export function updateState<T = any, TError = unknown>(
	key: string,
	partial: Partial<TaskState<T, TError>>,
): void {
	const current = getState<T, TError>(key);
	if (current) {
		const newState = { ...current, ...partial };
		setState(key, newState);
	}
}

/**
 * 删除指定 taskKey 的状态（清除缓存）
 * @param key taskKey
 */
export function deleteState(key: string): void {
	globalStore.delete(key);
	notifyListeners(key, createInitialState());
}

/**
 * 创建初始状态
 */
export function createInitialState<T = any, TError = unknown>(
	requestId = 0,
): TaskState<T, TError> {
	return {
		data: null,
		loading: false,
		error: null,
		retryCount: 0,
		lastUpdated: null,
		requestId,
	};
}

/**
 * 检查缓存是否有效
 * @param state 状态对象
 * @param cacheTime 缓存时间（毫秒）
 * @returns 缓存是否有效
 */
export function isCacheValid<T = any, TError = unknown>(
	state: TaskState<T, TError> | null,
	cacheTime: number,
): boolean {
	if (!state || !state.lastUpdated || cacheTime <= 0) {
		return false;
	}
	const now = Date.now();
	return now - state.lastUpdated < cacheTime;
}

/**
 * 订阅指定 taskKey 的状态变化
 * @param key taskKey
 * @param listener 监听器函数
 * @returns 取消订阅的函数
 */
export function subscribe<T = any, TError = unknown>(
	key: string,
	listener: StateListener<T, TError>,
): () => void {
	if (!listeners.has(key)) {
		listeners.set(key, new Set());
	}
	listeners.get(key)?.add(listener as StateListener);

	// 返回取消订阅函数
	return () => {
		const keyListeners = listeners.get(key);
		if (keyListeners) {
			keyListeners.delete(listener as StateListener);
			// 如果该 key 没有监听器了，清理 Map
			if (keyListeners.size === 0) {
				listeners.delete(key);
			}
		}
	};
}

/**
 * 通知所有订阅了指定 taskKey 的监听器
 * @param key taskKey
 * @param state 新状态
 */
function notifyListeners<T = any, TError = unknown>(
	key: string,
	state: AsyncState<T, TError>,
): void {
	const keyListeners = listeners.get(key);
	if (keyListeners) {
		// 将 TaskState 转换为 AsyncState（去掉 requestId）
		const { data, loading, error, retryCount, lastUpdated } = state;
		const asyncState: AsyncState<T, TError> = {
			data,
			loading,
			error,
			retryCount,
			lastUpdated,
		};
		for (const listener of keyListeners) {
			listener(asyncState);
		}
	}
}
