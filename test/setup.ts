import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";

// Stripe SDK v22+ throws on module-level instantiation if apiKey is undefined.
// Tests mock Stripe calls but still import shared/lib/stripe.ts transitively.
process.env.STRIPE_SECRET_KEY ??= "sk_test_unit_test_stub";

// `generateInvoiceAccessToken` (invoice token HMAC for guest checkouts —
// EINV-GLOBAL-012) requires BETTER_AUTH_SECRET ≥ 32 chars. Stub in tests
// so anything that imports the helper transitively can run.
process.env.BETTER_AUTH_SECRET ??= "test-better-auth-secret-not-used-in-prod-32chars-min";

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

// jsdom does not implement ResizeObserver — provide a no-op stub used by
// dnd-kit and other libs that observe element size changes.
if (typeof globalThis.ResizeObserver === "undefined") {
	globalThis.ResizeObserver = class ResizeObserver {
		observe() {}
		unobserve() {}
		disconnect() {}
	};
}

// jsdom does not implement window.scrollTo — the app calls it fire-and-forget
// (products filter sheet, carousels). Stub it so the "Not implemented" line
// stops flooding the test output; tests can still spy on it.
if (typeof window !== "undefined") {
	Object.defineProperty(window, "scrollTo", {
		writable: true,
		configurable: true,
		value: () => undefined,
	});
}

// jsdom does not implement HTMLMediaElement load()/pause() — video previews and
// thumbnail generation (modules/media) call them on refs. Same rationale.
if (typeof HTMLMediaElement !== "undefined") {
	HTMLMediaElement.prototype.load = () => undefined;
	HTMLMediaElement.prototype.pause = () => undefined;
}

// jsdom has no canvas backend (the `canvas` package is deliberately not installed).
// It already returns null from both methods but logs a "Not implemented" line on
// every call. Return the SAME values explicitly: the capability probes in
// modules/media (`!!canvas.getContext("2d")`, `toDataURL(...).startsWith(...)`)
// keep taking their unsupported/fallback path — only the noise disappears.
if (typeof HTMLCanvasElement !== "undefined") {
	HTMLCanvasElement.prototype.getContext = (() =>
		null) as typeof HTMLCanvasElement.prototype.getContext;
	HTMLCanvasElement.prototype.toDataURL = (() =>
		null) as unknown as typeof HTMLCanvasElement.prototype.toDataURL;
}

// Global cleanup to prevent mock leaks between tests
afterEach(() => {
	vi.restoreAllMocks();
});

// Restore real timers if any test used fake timers
afterEach(() => {
	vi.useRealTimers();
});
