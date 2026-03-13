import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAnnouncementBar } from "../use-announcement-bar";
import { STORAGE_PREFIX, simpleHash } from "../announcement-bar.constants";

// Mock motion/react to avoid AnimatePresence issues in hook tests
vi.mock("motion/react", () => ({
	useReducedMotion: () => false,
}));

// Mock the swipe hook since we test it separately
vi.mock("../use-swipe-to-dismiss", () => ({
	useSwipeToDismiss: () => ({ swipeOffset: 0 }),
}));

const DEFAULT_OPTIONS = {
	message: "Livraison offerte dès 50€",
	storageKey: "test-id",
	dismissDurationHours: 24,
};

function getFullKey(message: string, storageKey: string) {
	return `${STORAGE_PREFIX}${storageKey}-${simpleHash(message)}`;
}

// Mock localStorage since jsdom doesn't always provide clear()
const localStorageMock = (() => {
	let store: Record<string, string> = {};
	return {
		getItem: vi.fn((key: string) => store[key] ?? null),
		setItem: vi.fn((key: string, value: string) => {
			store[key] = value;
		}),
		removeItem: vi.fn((key: string) => {
			delete store[key];
		}),
		clear: vi.fn(() => {
			store = {};
		}),
		get length() {
			return Object.keys(store).length;
		},
		key: vi.fn(() => null),
	};
})();

beforeEach(() => {
	Object.defineProperty(window, "localStorage", { value: localStorageMock, writable: true });
	localStorageMock.clear();
	vi.clearAllMocks();
	document.documentElement.style.removeProperty("--announcement-bar-height");
});

// ─── Visibility ─────────────────────────────────────────────────────

describe("useAnnouncementBar - visibility", () => {
	it("starts hidden and becomes visible after mount", async () => {
		const { result } = renderHook(() => useAnnouncementBar(DEFAULT_OPTIONS));

		// Initially false (before queueMicrotask fires)
		expect(result.current.isVisible).toBe(false);

		// After microtask
		await act(async () => {
			await Promise.resolve();
		});
		expect(result.current.isVisible).toBe(true);
	});

	it("stays hidden when dismissed and not expired", async () => {
		const key = getFullKey(DEFAULT_OPTIONS.message, DEFAULT_OPTIONS.storageKey);
		const futureExpiry = Date.now() + 24 * 60 * 60 * 1000;
		localStorageMock.setItem(key, String(futureExpiry));

		const { result } = renderHook(() => useAnnouncementBar(DEFAULT_OPTIONS));

		await act(async () => {
			await Promise.resolve();
		});
		expect(result.current.isVisible).toBe(false);
	});

	it("becomes visible when dismiss has expired", async () => {
		const key = getFullKey(DEFAULT_OPTIONS.message, DEFAULT_OPTIONS.storageKey);
		const pastExpiry = Date.now() - 1000;
		localStorageMock.setItem(key, String(pastExpiry));

		const { result } = renderHook(() => useAnnouncementBar(DEFAULT_OPTIONS));

		await act(async () => {
			await Promise.resolve();
		});
		expect(result.current.isVisible).toBe(true);
	});

	it("cleans up expired localStorage entry", async () => {
		const key = getFullKey(DEFAULT_OPTIONS.message, DEFAULT_OPTIONS.storageKey);
		const pastExpiry = Date.now() - 1000;
		localStorageMock.setItem(key, String(pastExpiry));

		renderHook(() => useAnnouncementBar(DEFAULT_OPTIONS));

		await act(async () => {
			await Promise.resolve();
		});
		expect(localStorageMock.removeItem).toHaveBeenCalledWith(key);
	});
});

// ─── Dismiss ────────────────────────────────────────────────────────

describe("useAnnouncementBar - dismiss", () => {
	it("sets isVisible to false on dismiss", async () => {
		const { result } = renderHook(() => useAnnouncementBar(DEFAULT_OPTIONS));

		await act(async () => {
			await Promise.resolve();
		});
		expect(result.current.isVisible).toBe(true);

		act(() => {
			result.current.dismiss();
		});
		expect(result.current.isVisible).toBe(false);
	});

	it("stores expiry in localStorage on dismiss", async () => {
		vi.useFakeTimers({ now: new Date("2026-03-13T12:00:00Z") });

		const { result } = renderHook(() => useAnnouncementBar(DEFAULT_OPTIONS));

		await act(async () => {
			await Promise.resolve();
		});

		act(() => {
			result.current.dismiss();
		});

		const key = getFullKey(DEFAULT_OPTIONS.message, DEFAULT_OPTIONS.storageKey);
		expect(localStorageMock.setItem).toHaveBeenCalledWith(
			key,
			String(Date.now() + 24 * 60 * 60 * 1000),
		);
	});

	it("uses custom dismiss duration", async () => {
		vi.useFakeTimers({ now: new Date("2026-03-13T12:00:00Z") });

		const options = { ...DEFAULT_OPTIONS, dismissDurationHours: 48 };
		const { result } = renderHook(() => useAnnouncementBar(options));

		await act(async () => {
			await Promise.resolve();
		});

		act(() => {
			result.current.dismiss();
		});

		const key = getFullKey(options.message, options.storageKey);
		expect(localStorageMock.setItem).toHaveBeenCalledWith(
			key,
			String(Date.now() + 48 * 60 * 60 * 1000),
		);
	});
});

// ─── CSS Variable ───────────────────────────────────────────────────

describe("useAnnouncementBar - CSS variable", () => {
	it("sets --announcement-bar-height when visible", async () => {
		renderHook(() => useAnnouncementBar(DEFAULT_OPTIONS));

		await act(async () => {
			await Promise.resolve();
		});

		const value = document.documentElement.style.getPropertyValue("--announcement-bar-height");
		expect(value).toBe("calc(var(--ab-height) + env(safe-area-inset-top, 0px))");
	});

	it("resets --announcement-bar-height on unmount", async () => {
		const { unmount } = renderHook(() => useAnnouncementBar(DEFAULT_OPTIONS));

		await act(async () => {
			await Promise.resolve();
		});

		unmount();

		const value = document.documentElement.style.getPropertyValue("--announcement-bar-height");
		expect(value).toBe("0px");
	});
});

// ─── localStorage unavailable ───────────────────────────────────────

describe("useAnnouncementBar - localStorage errors", () => {
	it("shows bar when localStorage throws on getItem", async () => {
		localStorageMock.getItem.mockImplementation(() => {
			throw new Error("localStorage disabled");
		});

		const { result } = renderHook(() => useAnnouncementBar(DEFAULT_OPTIONS));

		await act(async () => {
			await Promise.resolve();
		});
		expect(result.current.isVisible).toBe(true);
	});

	it("dismiss works even when localStorage throws on setItem", async () => {
		localStorageMock.setItem.mockImplementation(() => {
			throw new Error("localStorage full");
		});

		const { result } = renderHook(() => useAnnouncementBar(DEFAULT_OPTIONS));

		await act(async () => {
			await Promise.resolve();
		});

		// Should not throw
		act(() => {
			result.current.dismiss();
		});
		expect(result.current.isVisible).toBe(false);
	});
});
