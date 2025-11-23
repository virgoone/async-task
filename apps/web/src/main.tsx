import { createRouter, RouterProvider } from "@tanstack/react-router";
import ReactDOM from "react-dom/client";
import Loader from "./components/loader";
import { routeTree } from "./routeTree.gen";

const router = createRouter({
	routeTree,
	defaultPreload: "intent",
	defaultPendingComponent: () => <Loader />,
	context: {},
});

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

// 启动 MSW
async function enableMocking() {
	// 可以通过环境变量 VITE_ENABLE_MSW 来控制是否启用 MSW
	// 默认只在开发环境启用，但可以通过设置 VITE_ENABLE_MSW=true 来在生产环境启用
	const shouldEnableMSW =
		import.meta.env.MODE === "development" ||
		import.meta.env.VITE_ENABLE_MSW === "true";

	if (!shouldEnableMSW) {
		return;
	}

	const { worker } = await import("./mocks/browser");

	return worker.start({
		onUnhandledRequest: "bypass",
	});
}

const rootElement = document.getElementById("app");

if (!rootElement) {
	throw new Error("Root element not found");
}

if (!rootElement.innerHTML) {
	enableMocking().then(() => {
		const root = ReactDOM.createRoot(rootElement);
		root.render(<RouterProvider router={router} />);
	});
}
