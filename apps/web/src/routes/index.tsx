import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { type ExecutionContext, useAsyncTask } from "use-async-task";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/")({
	component: Index,
});

// API 基础 URL
const API_BASE = "";

// Demo 1: 列表加载和翻页
interface ListItem {
	id: string;
	title: string;
}

interface ListData {
	items: ListItem[];
	total: number;
}

function PaginationDemo() {
	const [page, setPage] = useState(1);

	const { data, loading, error, execute } = useAsyncTask<
		[number],
		ListData,
		Error
	>(async (p: number) => {
		const response = await fetch(`${API_BASE}/api/list?page=${p}`);
		if (!response.ok) throw new Error("加载失败");
		return response.json() as Promise<ListData>;
	});

	// page 变化时自动加载
	useEffect(() => {
		execute(page);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [page]);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Demo 1: 列表加载与翻页</CardTitle>
				<CardDescription>依赖 page 变化时自动加载数据</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{loading ? (
					<div className="space-y-2">
						{[...Array(5)].map((_, i) => (
							<Skeleton key={`skeleton-${i}`} className="h-12 w-full" />
						))}
					</div>
				) : error ? (
					<div className="flex items-center gap-2 text-red-500">
						<AlertCircle className="h-5 w-5" />
						<span>加载失败</span>
					</div>
				) : data ? (
					<>
						<div className="space-y-2">
							{data.items.map((item: ListItem) => (
								<div key={item.id} className="rounded-lg border p-3">
									{item.title}
								</div>
							))}
						</div>
						<div className="flex items-center justify-between gap-2">
							<Button
								onClick={() => setPage((p) => Math.max(1, p - 1))}
								disabled={page === 1 || loading}
								variant="outline"
							>
								上一页
							</Button>
							<span className="text-muted-foreground text-sm">
								第 {page} 页 / 共 {Math.ceil(data.total / 5)} 页
							</span>
							<Button
								onClick={() => setPage((p) => p + 1)}
								disabled={page >= Math.ceil(data.total / 5) || loading}
								variant="outline"
							>
								下一页
							</Button>
						</div>
					</>
				) : null}
			</CardContent>
		</Card>
	);
}

// Demo 2: 搜索响应（竞态控制 + 缓存）
interface SearchItem {
	id: string;
	title: string;
}

function SearchDemo() {
	const [query, setQuery] = useState("");

	const { data, loading, error, lastUpdated, execute } = useAsyncTask<
		[string],
		SearchItem[],
		Error
	>(
		async (q: string, context?: ExecutionContext) => {
			if (!q) return [];
			const response = await fetch(
				`${API_BASE}/api/search?q=${encodeURIComponent(q)}`,
				{ signal: context?.signal },
			);
			if (!response.ok) throw new Error("搜索失败");
			return response.json() as Promise<SearchItem[]>;
		},
		{
			cacheTime: 30000, // 30秒缓存
			taskKey: (q: string) => `search-${q}`,
		},
	);

	// 使用 useEffect 手动控制执行时机
	useEffect(() => {
		if (query) {
			execute(query);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [query]);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Demo 2: 搜索响应</CardTitle>
				<CardDescription>
					真正的请求取消 + 竞态控制 +
					30秒缓存（快速输入时会取消旧请求，回退时使用缓存）
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<Input
					type="text"
					placeholder="输入搜索关键词..."
					value={query}
					onChange={(e) => setQuery(e.target.value)}
				/>

				{loading ? (
					<div className="flex items-center gap-2">
						<Loader2 className="h-4 w-4 animate-spin" />
						<span className="text-muted-foreground text-sm">搜索中...</span>
					</div>
				) : error ? (
					<div className="flex items-center gap-2 text-red-500">
						<AlertCircle className="h-5 w-5" />
						<span>搜索失败</span>
					</div>
				) : !query ? (
					<p className="text-muted-foreground text-sm">请输入搜索关键词</p>
				) : data && data.length > 0 ? (
					<>
						<div className="space-y-2">
							{data.map((item: SearchItem) => (
								<div key={item.id} className="rounded-lg border p-3">
									{item.title}
								</div>
							))}
						</div>
						{lastUpdated && (
							<p className="text-muted-foreground text-xs">
								最后更新: {new Date(lastUpdated).toLocaleTimeString()}
								（从缓存加载）
							</p>
						)}
					</>
				) : (
					<p className="text-muted-foreground text-sm">无结果</p>
				)}
			</CardContent>
		</Card>
	);
}

// Demo 3: 轮询刷新
function PollingDemo() {
	const [enabled, setEnabled] = useState(false);

	const { data, loading, lastUpdated, cancel } = useAsyncTask(
		async () => {
			const response = await fetch(`${API_BASE}/api/stats`);
			if (!response.ok) throw new Error("加载失败");
			return response.json();
		},
		{
			immediate: enabled,
			dependencies: [enabled],
			pollingInterval: enabled ? 3000 : 0, // 3秒轮询
		},
	);

	const handleToggle = () => {
		if (enabled) {
			cancel();
		}
		setEnabled(!enabled);
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>Demo 3: 轮询刷新</CardTitle>
				<CardDescription>
					每 3 秒自动刷新数据（开启后观察时间戳变化）
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<Button
					onClick={handleToggle}
					variant={enabled ? "destructive" : "default"}
				>
					<RefreshCw
						className={`mr-2 h-4 w-4 ${enabled && !loading ? "animate-spin" : ""}`}
					/>
					{enabled ? "停止轮询" : "开始轮询"}
				</Button>

				{data && (
					<div className="space-y-2 rounded-lg border p-4">
						<div className="flex items-center justify-between">
							<span className="font-medium">随机值:</span>
							<span className="font-bold text-2xl">{data.value}</span>
						</div>
						<div className="flex items-center justify-between text-muted-foreground text-sm">
							<span>最后更新:</span>
							<span>
								{lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : "-"}
							</span>
						</div>
						{loading && (
							<div className="flex items-center gap-2 text-muted-foreground text-sm">
								<Loader2 className="h-3 w-3 animate-spin" />
								<span>正在刷新...</span>
							</div>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	);
}

// Demo 4: 重试机制
function RetryDemo() {
	const [shouldFail, setShouldFail] = useState(true);
	const [requestCount, setRequestCount] = useState(0);

	const { data, loading, error, retryCount, execute } = useAsyncTask<
		[],
		{ message: string },
		Error
	>(
		async () => {
			setRequestCount((c) => c + 1);
			const response = await fetch(
				`${API_BASE}/api/test-retry?shouldFail=${shouldFail}`,
			);
			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || "请求失败");
			}
			return response.json() as Promise<{ message: string }>;
		},
		{
			maxRetries: 3,
		},
	);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Demo 4: 重试机制</CardTitle>
				<CardDescription>失败时自动重试（最多 3 次）</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="flex items-center gap-2">
					<input
						type="checkbox"
						id="shouldFail"
						checked={shouldFail}
						onChange={(e) => {
							setShouldFail(e.target.checked);
							setRequestCount(0);
						}}
						className="h-4 w-4"
					/>
					<label htmlFor="shouldFail" className="cursor-pointer text-sm">
						模拟请求失败
					</label>
				</div>

				<Button
					onClick={() => {
						setRequestCount(0);
						execute();
					}}
					disabled={loading}
				>
					{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
					发起请求
				</Button>

				<div className="space-y-2">
					<div className="text-sm">
						<span className="font-medium">请求次数: </span>
						<span>{requestCount}</span>
					</div>
					<div className="text-sm">
						<span className="font-medium">重试次数: </span>
						<span>{retryCount}</span>
					</div>
				</div>

				{error && (
					<div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
						<AlertCircle className="h-5 w-5" />
						<span>
							{error instanceof Error ? error.message : String(error)}
						</span>
					</div>
				)}

				{data && !loading && (
					<div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-green-700">
						<CheckCircle2 className="h-5 w-5" />
						<span>{data.message}</span>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

// Demo 5: 跨组件状态共享
function SharedStateDemo() {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Demo 5: 跨组件状态共享</CardTitle>
				<CardDescription>多个组件共享同一个 taskKey 的状态</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="grid gap-4 md:grid-cols-2">
					<SharedComponent title="组件 A" />
					<SharedComponent title="组件 B" />
				</div>
				<p className="text-muted-foreground text-xs">
					点击任一组件的按钮，两个组件的状态会同步更新
				</p>
			</CardContent>
		</Card>
	);
}

function SharedComponent({ title }: { title: string }) {
	const { data, loading, execute } = useAsyncTask(
		async () => {
			const response = await fetch(`${API_BASE}/api/shared-data`);
			if (!response.ok) throw new Error("加载失败");
			const result = await response.json();
			return {
				...result,
				from: title,
			};
		},
		{
			taskKey: "shared-state", // 相同的 taskKey
		},
	);

	return (
		<div className="space-y-3 rounded-lg border p-4">
			<h3 className="font-medium">{title}</h3>
			<Button onClick={() => execute()} disabled={loading} size="sm">
				{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
				加载数据
			</Button>
			{data && (
				<div className="space-y-1 text-sm">
					<p>来源: {data.from}</p>
					<p className="text-muted-foreground">
						时间: {new Date(data.timestamp).toLocaleTimeString()}
					</p>
				</div>
			)}
		</div>
	);
}

function Index() {
	return (
		<div className="container mx-auto space-y-8 py-8">
			<div className="space-y-2">
				<h1 className="font-bold text-4xl">useAsyncTask Hook Demo</h1>
				<p className="text-muted-foreground">
					一个强大的 React Hook，用于管理复杂的异步任务状态
				</p>
			</div>

			<div className="space-y-6">
				<PaginationDemo />
				<SearchDemo />
				<PollingDemo />
				<RetryDemo />
				<SharedStateDemo />
			</div>
		</div>
	);
}
