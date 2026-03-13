import type React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAnnouncementBar } from "../use-announcement-bar";

// Mock motion/react to avoid AnimatePresence issues in hook tests
vi.mock("motion/react", () => ({
	useReducedMotion: () => false,
}));

// Mock the swipe hook since we test it separately
vi.mock("../use-swipe-to-dismiss", () => ({
	useSwipeToDismiss: () => ({ swipeOffset: 0 }),
}));

// Mock server action
const mockFormAction = vi.fn();
vi.mock("@/modules/announcements/actions/set-announcement-dismissed", () => ({
	setAnnouncementDismissed: vi.fn(),
}));

vi.mock("@/shared/utils/with-callbacks", () => ({
	withCallbacks: (fn: unknown) => fn,
}));

// Mock useActionState to return our mock formAction
vi.mock("react", async () => {
	const actual = await vi.importActual<typeof React>("react");
	return {
		...actual,
		useActionState: () => [undefined, mockFormAction, false],
		useOptimistic: (initial: boolean) => {
			const [state, setState] = actual.useState(initial);
			return [state, setState];
		},
		useTransition: () => {
			return [
				false,
				(fn: () => void) => {
					fn();
				},
			];
		},
	};
});

const DEFAULT_OPTIONS = {
	announcementId: "clx1234567890",
	dismissDurationHours: 24,
};

beforeEach(() => {
	vi.clearAllMocks();
	mockFormAction.mockClear();
	document.documentElement.style.removeProperty("--announcement-bar-height");
});

// ─── Visibility ─────────────────────────────────────────────────────

describe("useAnnouncementBar - visibility", () => {
	it("starts not dismissed (visible)", () => {
		const { result } = renderHook(() => useAnnouncementBar(DEFAULT_OPTIONS));
		expect(result.current.isDismissed).toBe(false);
	});
});

// ─── Dismiss ────────────────────────────────────────────────────────

describe("useAnnouncementBar - dismiss", () => {
	it("sets isDismissed to true on dismiss", () => {
		const { result } = renderHook(() => useAnnouncementBar(DEFAULT_OPTIONS));

		act(() => {
			result.current.dismiss();
		});

		expect(result.current.isDismissed).toBe(true);
	});

	it("calls formAction with correct FormData on dismiss", () => {
		const { result } = renderHook(() => useAnnouncementBar(DEFAULT_OPTIONS));

		act(() => {
			result.current.dismiss();
		});

		expect(mockFormAction).toHaveBeenCalledTimes(1);
		const formData = mockFormAction.mock.calls[0]![0] as FormData;
		expect(formData.get("announcementId")).toBe("clx1234567890");
		expect(formData.get("dismissDurationHours")).toBe("24");
	});

	it("passes custom dismissDurationHours in FormData", () => {
		const options = { ...DEFAULT_OPTIONS, dismissDurationHours: 48 };
		const { result } = renderHook(() => useAnnouncementBar(options));

		act(() => {
			result.current.dismiss();
		});

		const formData = mockFormAction.mock.calls[0]![0] as FormData;
		expect(formData.get("dismissDurationHours")).toBe("48");
	});
});

// ─── CSS Variable ───────────────────────────────────────────────────

describe("useAnnouncementBar - CSS variable", () => {
	it("sets --announcement-bar-height when visible", () => {
		renderHook(() => useAnnouncementBar(DEFAULT_OPTIONS));

		const value = document.documentElement.style.getPropertyValue("--announcement-bar-height");
		expect(value).toBe("calc(var(--ab-height) + env(safe-area-inset-top, 0px))");
	});

	it("resets --announcement-bar-height on unmount", () => {
		const { unmount } = renderHook(() => useAnnouncementBar(DEFAULT_OPTIONS));

		unmount();

		const value = document.documentElement.style.getPropertyValue("--announcement-bar-height");
		expect(value).toBe("0px");
	});
});

// ─── Focus management ───────────────────────────────────────────────

describe("useAnnouncementBar - focus management", () => {
	it("focuses #main-content on dismiss when it exists", async () => {
		const mainContent = document.createElement("main");
		mainContent.id = "main-content";
		mainContent.tabIndex = -1;
		mainContent.focus = vi.fn();
		document.body.appendChild(mainContent);

		const navLink = document.createElement("a");
		const nav = document.createElement("nav");
		navLink.focus = vi.fn();
		nav.appendChild(navLink);
		document.body.appendChild(nav);

		const { result } = renderHook(() => useAnnouncementBar(DEFAULT_OPTIONS));

		act(() => {
			result.current.dismiss();
		});

		// Wait for requestAnimationFrame
		await act(async () => {
			await new Promise((r) => requestAnimationFrame(r));
		});

		expect(mainContent.focus).toHaveBeenCalledWith({ preventScroll: true });
		expect(navLink.focus).not.toHaveBeenCalled();

		document.body.removeChild(mainContent);
		document.body.removeChild(nav);
	});

	it("falls back to nav link when #main-content is missing", async () => {
		const navLink = document.createElement("a");
		const nav = document.createElement("nav");
		navLink.focus = vi.fn();
		nav.appendChild(navLink);
		document.body.appendChild(nav);

		const { result } = renderHook(() => useAnnouncementBar(DEFAULT_OPTIONS));

		act(() => {
			result.current.dismiss();
		});

		await act(async () => {
			await new Promise((r) => requestAnimationFrame(r));
		});

		expect(navLink.focus).toHaveBeenCalledWith({ preventScroll: true });

		document.body.removeChild(nav);
	});
});

// ─── onExitComplete ─────────────────────────────────────────────────

describe("useAnnouncementBar - onExitComplete", () => {
	it("resets --announcement-bar-height when called", () => {
		const { result } = renderHook(() => useAnnouncementBar(DEFAULT_OPTIONS));

		const value = document.documentElement.style.getPropertyValue("--announcement-bar-height");
		expect(value).toBe("calc(var(--ab-height) + env(safe-area-inset-top, 0px))");

		act(() => {
			result.current.onExitComplete();
		});

		const resetValue = document.documentElement.style.getPropertyValue("--announcement-bar-height");
		expect(resetValue).toBe("0px");
	});
});
