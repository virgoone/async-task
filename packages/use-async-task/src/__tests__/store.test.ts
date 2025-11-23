import { beforeEach, describe, expect, it } from "vitest";
import {
	createInitialState,
	deleteState,
	getState,
	isCacheValid,
	setState,
	subscribe,
	updateState,
} from "../store";

describe("Store", () => {
	beforeEach(() => {
		// 清理所有状态
		const keys = ["test-key", "another-key"];
		for (const key of keys) {
			deleteState(key);
		}
	});

	describe("createInitialState", () => {
		it("应该创建初始状态", () => {
			const state = createInitialState();

			expect(state).toEqual({
				data: null,
				loading: false,
				error: null,
				retryCount: 0,
				lastUpdated: null,
				requestId: 0,
			});
		});

		it("应该支持自定义 requestId", () => {
			const state = createInitialState(5);

			expect(state.requestId).toBe(5);
		});
	});

	describe("getState 和 setState", () => {
		it("不存在的 key 应该返回 null", () => {
			const state = getState("non-existent");

			expect(state).toBeNull();
		});

		it("应该能设置和获取状态", () => {
			const state = {
				...createInitialState(),
				data: "test-data",
				loading: true,
			};

			setState("test-key", state);
			const retrieved = getState("test-key");

			expect(retrieved).toEqual(state);
		});

		it("应该支持多个不同的 key", () => {
			const state1 = { ...createInitialState(), data: "data1" };
			const state2 = { ...createInitialState(), data: "data2" };

			setState("key1", state1);
			setState("key2", state2);

			expect(getState("key1")?.data).toBe("data1");
			expect(getState("key2")?.data).toBe("data2");
		});
	});

	describe("updateState", () => {
		it("应该更新部分状态", () => {
			const initialState = {
				...createInitialState(),
				data: "initial",
			};

			setState("test-key", initialState);
			updateState("test-key", { loading: true });

			const updated = getState("test-key");

			expect(updated?.data).toBe("initial");
			expect(updated?.loading).toBe(true);
		});

		it("不存在的 key 不应该创建状态", () => {
			updateState("non-existent", { loading: true });

			const state = getState("non-existent");

			expect(state).toBeNull();
		});
	});

	describe("deleteState", () => {
		it("应该删除状态", () => {
			setState("test-key", createInitialState());

			expect(getState("test-key")).not.toBeNull();

			deleteState("test-key");

			expect(getState("test-key")).toBeNull();
		});

		it("删除不存在的 key 不应该报错", () => {
			expect(() => deleteState("non-existent")).not.toThrow();
		});
	});

	describe("isCacheValid", () => {
		it("没有 state 时应该返回 false", () => {
			expect(isCacheValid(null, 1000)).toBe(false);
		});

		it("没有 lastUpdated 时应该返回 false", () => {
			const state = createInitialState();

			expect(isCacheValid(state, 1000)).toBe(false);
		});

		it("cacheTime 为 0 时应该返回 false", () => {
			const state = {
				...createInitialState(),
				lastUpdated: Date.now(),
			};

			expect(isCacheValid(state, 0)).toBe(false);
		});

		it("缓存未过期时应该返回 true", () => {
			const state = {
				...createInitialState(),
				lastUpdated: Date.now() - 500,
			};

			expect(isCacheValid(state, 1000)).toBe(true);
		});

		it("缓存已过期时应该返回 false", () => {
			const state = {
				...createInitialState(),
				lastUpdated: Date.now() - 1500,
			};

			expect(isCacheValid(state, 1000)).toBe(false);
		});
	});

	describe("subscribe", () => {
		it("应该能订阅状态变化", () => {
			const listener = vi.fn();

			subscribe("test-key", listener);

			const state = { ...createInitialState(), data: "test" };
			setState("test-key", state);

			expect(listener).toHaveBeenCalledTimes(1);
			expect(listener).toHaveBeenCalledWith({
				data: "test",
				loading: false,
				error: null,
				retryCount: 0,
				lastUpdated: null,
			});
		});

		it("应该能取消订阅", () => {
			const listener = vi.fn();

			const unsubscribe = subscribe("test-key", listener);

			setState("test-key", createInitialState());
			expect(listener).toHaveBeenCalledTimes(1);

			unsubscribe();

			setState("test-key", { ...createInitialState(), data: "new" });
			expect(listener).toHaveBeenCalledTimes(1); // 没有再次调用
		});

		it("应该支持多个监听器", () => {
			const listener1 = vi.fn();
			const listener2 = vi.fn();

			subscribe("test-key", listener1);
			subscribe("test-key", listener2);

			setState("test-key", createInitialState());

			expect(listener1).toHaveBeenCalled();
			expect(listener2).toHaveBeenCalled();
		});

		it("不同的 key 应该独立通知", () => {
			const listener1 = vi.fn();
			const listener2 = vi.fn();

			subscribe("key1", listener1);
			subscribe("key2", listener2);

			setState("key1", createInitialState());

			expect(listener1).toHaveBeenCalled();
			expect(listener2).not.toHaveBeenCalled();
		});
	});
});
