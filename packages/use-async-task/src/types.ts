import type { DependencyList } from "react";

/**
 * 异步任务的状态
 */
export type AsyncState<T, TError = unknown> = {
	/** 任务返回的数据 */
	data: T | null;
	/** 是否正在执行 */
	loading: boolean;
	/** 执行过程中的错误 */
	error: TError | null;
	/** 当前重试次数 */
	retryCount: number;
	/** 最后更新时间戳（毫秒） */
	lastUpdated: number | null;
};

/**
 * 执行上下文，包含额外的执行信息
 */
export interface ExecutionContext {
	/** AbortSignal，用于取消请求 */
	signal: AbortSignal;
}

/**
 * useAsyncTask 的配置选项
 */
export interface UseAsyncTaskOptions<_T, Args extends any[]> {
	/**
	 * 组件挂载或 dependencies 变化时，是否自动执行一次请求
	 * 默认：false
	 */
	immediate?: boolean;

	/**
	 * 依赖列表，当依赖变化时会重新执行任务
	 */
	dependencies?: DependencyList;

	/**
	 * 轮询间隔（毫秒）
	 * - > 0：在上一次请求完成后等待指定间隔，再发起下一次请求
	 * - 组件卸载或依赖变化时需要清除轮询
	 * 默认：0（不轮询）
	 */
	pollingInterval?: number;

	/**
	 * 最大重试次数
	 * 默认：0（不重试）
	 */
	maxRetries?: number;

	/**
	 * 缓存有效期（毫秒）
	 * - 若存在未过期的缓存，则优先返回缓存，不重新发请求
	 * - 若已过期，则发起新请求并更新缓存
	 * 默认：0（不缓存）
	 */
	cacheTime?: number;

	/**
	 * 任务 key，用于标识同一类任务并实现全局缓存 / 竞态控制
	 * - 字符串：固定 key
	 * - 函数：根据执行参数动态生成 key
	 */
	taskKey?: string | (() => string);
}

/**
 * useAsyncTask 返回的结果
 */
export interface UseAsyncTaskResult<Args extends any[], T, TError = unknown>
	extends AsyncState<T, TError> {
	/**
	 * 执行异步任务
	 * @param args 传递给 action 的参数
	 * @returns Promise，成功时返回数据，失败或被取消时返回 void
	 */
	execute: (...args: Args) => Promise<T | void>;

	/**
	 * 取消当前正在执行的任务
	 * 注意：这不会真正中断 Promise，只会忽略其结果
	 */
	cancel: () => void;

	/**
	 * 重置状态为初始值并清除缓存
	 */
	reset: () => void;
}

/**
 * 内部存储的任务状态
 * @internal
 */
export interface TaskState<T = any, TError = unknown>
	extends AsyncState<T, TError> {
	/** 当前请求 ID，用于竞态控制 */
	requestId: number;
}

/**
 * 全局状态监听器的回调函数类型
 * @internal
 */
export type StateListener<T = any, TError = unknown> = (
	state: AsyncState<T, TError>,
) => void;
