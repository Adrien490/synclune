import { afterEach, describe, expect, it, vi } from "vitest";
import { withViewTransition } from "../view-transition";

describe("withViewTransition", () => {
	afterEach(() => {
		vi.restoreAllMocks();
		// Remove stubbed startViewTransition between tests
		Reflect.deleteProperty(document, "startViewTransition");
	});

	it("runs the callback directly when the API is not available", () => {
		const callback = vi.fn(() => "result");
		const result = withViewTransition(callback);
		expect(result).toBe("result");
		expect(callback).toHaveBeenCalledTimes(1);
	});

	it("runs the callback inside startViewTransition when available", () => {
		const startViewTransition = vi.fn((cb: () => void) => {
			cb();
			return { finished: Promise.resolve() };
		});
		(document as Document & { startViewTransition?: unknown }).startViewTransition =
			startViewTransition as unknown as Document["startViewTransition"];

		const callback = vi.fn(() => 42);
		const result = withViewTransition(callback);

		expect(startViewTransition).toHaveBeenCalledTimes(1);
		expect(callback).toHaveBeenCalledTimes(1);
		expect(result).toBe(42);
	});

	it("skips the view transition under prefers-reduced-motion", () => {
		const startViewTransition = vi.fn();
		(document as Document & { startViewTransition?: unknown }).startViewTransition =
			startViewTransition as unknown as Document["startViewTransition"];

		const matchMedia = vi.fn(
			(query: string) =>
				({
					matches: query === "(prefers-reduced-motion: reduce)",
					media: query,
					onchange: null,
					addListener: vi.fn(),
					removeListener: vi.fn(),
					addEventListener: vi.fn(),
					removeEventListener: vi.fn(),
					dispatchEvent: vi.fn(),
				}) as unknown as MediaQueryList,
		);
		Object.defineProperty(window, "matchMedia", {
			configurable: true,
			writable: true,
			value: matchMedia,
		});

		const callback = vi.fn(() => "direct");
		const result = withViewTransition(callback);

		expect(result).toBe("direct");
		expect(callback).toHaveBeenCalledTimes(1);
		expect(startViewTransition).not.toHaveBeenCalled();

		Reflect.deleteProperty(window, "matchMedia");
	});
});
