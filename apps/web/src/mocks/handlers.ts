import { HttpResponse, http } from "msw";

// 可取消的 delay 函数
function abortableDelay(ms: number, signal?: AbortSignal): Promise<void> {
	return new Promise((resolve, reject) => {
		if (signal?.aborted) {
			reject(new DOMException("Aborted", "AbortError"));
			return;
		}

		const timeoutId = setTimeout(() => {
			resolve();
		}, ms);

		signal?.addEventListener("abort", () => {
			clearTimeout(timeoutId);
			reject(new DOMException("Aborted", "AbortError"));
		});
	});
}

// Mock 数据生成器
function generateListItems(page: number, itemsPerPage = 5) {
	return Array.from({ length: itemsPerPage }, (_, i) => ({
		id: (page - 1) * itemsPerPage + i + 1,
		title: `第 ${page} 页 - 项目 ${i + 1}`,
	}));
}

function generateSearchResults(query: string) {
	if (!query) return [];
	return Array.from({ length: 5 }, (_, i) => ({
		id: i + 1,
		title: `搜索 "${query}" 的结果 ${i + 1}`,
	}));
}

// Mock handlers
export const handlers = [
	// 列表加载 API
	http.get("/api/list", async ({ request }) => {
		try {
			await abortableDelay(1000, request.signal);

			const url = new URL(request.url);
			const page = Number(url.searchParams.get("page")) || 1;

			return HttpResponse.json({
				items: generateListItems(page),
				page,
				total: 20,
			});
		} catch (error) {
			if (error instanceof Error && error.name === "AbortError") {
				// 请求被取消，静默处理
			}
			throw error;
		}
	}),

	// 搜索 API
	http.get("/api/search", async ({ request }) => {
		const url = new URL(request.url);
		const query = url.searchParams.get("q") || "";

		try {
			// 使用可取消的 delay
			await abortableDelay(800, request.signal);

			return HttpResponse.json(generateSearchResults(query));
		} catch (error) {
			if (error instanceof Error && error.name === "AbortError") {
				// 请求被取消，静默处理
			}
			throw error;
		}
	}),

	// 轮询数据 API
	http.get("/api/stats", async ({ request }) => {
		try {
			await abortableDelay(500, request.signal);

			return HttpResponse.json({
				timestamp: Date.now(),
				value: Math.floor(Math.random() * 100),
			});
		} catch (error) {
			if (error instanceof Error && error.name === "AbortError") {
				// 请求被取消，静默处理
			}
			throw error;
		}
	}),

	// 测试重试的 API（随机失败）
	http.get("/api/test-retry", async ({ request }) => {
		try {
			await abortableDelay(800, request.signal);

			const url = new URL(request.url);
			const shouldFail = url.searchParams.get("shouldFail") === "true";

			if (shouldFail) {
				return HttpResponse.json(
					{ error: "请求失败，请重试" },
					{ status: 500 },
				);
			}

			return HttpResponse.json({
				message: "请求成功！",
				timestamp: Date.now(),
			});
		} catch (error) {
			if (error instanceof Error && error.name === "AbortError") {
				// 请求被取消，静默处理
			}
			throw error;
		}
	}),

	// 跨组件状态共享 API
	http.get("/api/shared-data", async ({ request }) => {
		try {
			await abortableDelay(1500, request.signal);

			return HttpResponse.json({
				timestamp: Date.now(),
				data: "共享数据",
			});
		} catch (error) {
			if (error instanceof Error && error.name === "AbortError") {
				// 请求被取消，静默处理
			}
			throw error;
		}
	}),
];
