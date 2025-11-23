import { delay, HttpResponse, http } from "msw";

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
		await delay(1000); // 模拟网络延迟

		const url = new URL(request.url);
		const page = Number(url.searchParams.get("page")) || 1;

		return HttpResponse.json({
			items: generateListItems(page),
			page,
			total: 20,
		});
	}),

	// 搜索 API
	http.get("/api/search", async ({ request }) => {
		await delay(800); // 模拟网络延迟

		const url = new URL(request.url);
		const query = url.searchParams.get("q") || "";

		return HttpResponse.json(generateSearchResults(query));
	}),

	// 轮询数据 API
	http.get("/api/stats", async () => {
		await delay(500);

		return HttpResponse.json({
			timestamp: Date.now(),
			value: Math.floor(Math.random() * 100),
		});
	}),

	// 测试重试的 API（随机失败）
	http.get("/api/test-retry", async ({ request }) => {
		await delay(800);

		const url = new URL(request.url);
		const shouldFail = url.searchParams.get("shouldFail") === "true";

		if (shouldFail) {
			return HttpResponse.json({ error: "请求失败，请重试" }, { status: 500 });
		}

		return HttpResponse.json({
			message: "请求成功！",
			timestamp: Date.now(),
		});
	}),

	// 跨组件状态共享 API
	http.get("/api/shared-data", async () => {
		await delay(1500);

		return HttpResponse.json({
			timestamp: Date.now(),
			data: "共享数据",
		});
	}),
];
