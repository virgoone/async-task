import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ExecutionContext } from "../types";
import { useAsyncTask } from "../useAsyncTask";

describe("useAsyncTask", () => {
	describe("基本状态管理", () => {
		it("应该返回初始状态", () => {
			const { result } = renderHook(() => useAsyncTask(async () => "data"));

			expect(result.current.data).toBeNull();
			expect(result.current.loading).toBe(false);
			expect(result.current.error).toBeNull();
			expect(result.current.retryCount).toBe(0);
			expect(result.current.lastUpdated).toBeNull();
		});

		it("应该提供 execute, cancel, reset 方法", () => {
			const { result } = renderHook(() => useAsyncTask(async () => "data"));

			expect(typeof result.current.execute).toBe("function");
			expect(typeof result.current.cancel).toBe("function");
			expect(typeof result.current.reset).toBe("function");
		});
	});

	describe("手动执行", () => {
		it("执行成功时应该更新状态", async () => {
			const action = vi.fn().mockResolvedValue("success");
			const { result } = renderHook(() => useAsyncTask(action));

			// 执行任务
			const promise = result.current.execute();

			// 等待完成
			await promise;

			// 成功状态
			await waitFor(() => {
				expect(result.current.loading).toBe(false);
				expect(result.current.data).toBe("success");
				expect(result.current.error).toBeNull();
				expect(result.current.lastUpdated).toBeGreaterThan(0);
			});
		});

		it("执行失败时应该更新错误状态", async () => {
			const error = new Error("Failed");
			const action = vi.fn().mockRejectedValue(error);
			const { result } = renderHook(() => useAsyncTask(action));

			const promise = result.current.execute();
			await promise;

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
				expect(result.current.error).toBe(error);
				expect(result.current.data).toBeNull();
			});
		});
	});

	describe("reset", () => {
		it("reset 应该重置所有状态", async () => {
			const action = vi.fn().mockResolvedValue("data");
			const { result } = renderHook(() => useAsyncTask(action));

			await result.current.execute();
			await waitFor(() => {
				expect(result.current.data).toBe("data");
			});

			// 重置
			result.current.reset();

			await waitFor(() => {
				expect(result.current.data).toBeNull();
				expect(result.current.loading).toBe(false);
				expect(result.current.error).toBeNull();
				expect(result.current.retryCount).toBe(0);
				expect(result.current.lastUpdated).toBeNull();
			});
		});
	});

	describe("AbortSignal 支持", () => {
		it("应该传递 ExecutionContext 给 action", async () => {
			const action = vi.fn().mockResolvedValue("success");
			const { result } = renderHook(() => useAsyncTask(action));

			await result.current.execute("arg1");

			await waitFor(() => {
				expect(action).toHaveBeenCalled();
				// 检查是否传递了第二个参数（ExecutionContext）
				const secondArg = action.mock.calls[0][1];
				expect(secondArg).toBeDefined();
				expect(secondArg).toHaveProperty("signal");
				expect(secondArg.signal).toBeInstanceOf(AbortSignal);
			});
		});

		it("取消请求时应该 abort signal", async () => {
			let capturedSignal: AbortSignal | undefined;

			const action = vi.fn(async (_arg: string, context?: ExecutionContext) => {
				capturedSignal = context?.signal;
				// 模拟长时间运行的任务
				await new Promise((resolve) => setTimeout(resolve, 100));
				return "success";
			});

			const { result } = renderHook(() => useAsyncTask(action));

			// 启动任务
			result.current.execute("test");

			// 等待 action 被调用
			await waitFor(() => {
				expect(action).toHaveBeenCalled();
			});

			// 取消任务
			result.current.cancel();

			// 验证 signal 被 abort
			await waitFor(() => {
				expect(capturedSignal?.aborted).toBe(true);
			});
		});

		it("竞态控制：新请求应该取消旧请求的 signal", async () => {
			const signals: AbortSignal[] = [];

			const action = vi.fn(async (_arg: string, context?: ExecutionContext) => {
				if (context?.signal) {
					signals.push(context.signal);
				}
				await new Promise((resolve) => setTimeout(resolve, 50));
				return "success";
			});

			const { result } = renderHook(() => useAsyncTask(action));

			// 快速发起两个请求
			result.current.execute("request1");
			await new Promise((resolve) => setTimeout(resolve, 10));
			result.current.execute("request2");

			// 等待两个请求都被调用
			await waitFor(() => {
				expect(signals.length).toBe(2);
			});

			// 第一个请求的 signal 应该被 abort
			expect(signals[0].aborted).toBe(true);
			// 第二个请求的 signal 应该还是活跃的
			expect(signals[1].aborted).toBe(false);
		});
	});
});
