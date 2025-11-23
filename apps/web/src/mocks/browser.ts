import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

// 设置 Service Worker
export const worker = setupWorker(...handlers);
