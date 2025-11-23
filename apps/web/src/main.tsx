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
	if (import.meta.env.MODE !== "development") {
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
