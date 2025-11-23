import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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
});
