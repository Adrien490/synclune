import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";

// jsdom does not implement matchMedia — provide a desktop-default stub so
// useIsMobile / useMediaQuery don't throw. Tests can override per-test.
if (typeof window !== "undefined" && typeof window.matchMedia !== "function") {
	Object.defineProperty(window, "matchMedia", {
		writable: true,
		configurable: true,
		value: (query: string) => ({
			matches: false,
			media: query,
			onchange: null,
			addListener: () => {},
			removeListener: () => {},
			addEventListener: () => {},
			removeEventListener: () => {},
			dispatchEvent: () => false,
		}),
	});
}

// Global cleanup to prevent mock leaks between tests
afterEach(() => {
	vi.restoreAllMocks();
});

// Restore real timers if any test used fake timers
afterEach(() => {
	vi.useRealTimers();
});
