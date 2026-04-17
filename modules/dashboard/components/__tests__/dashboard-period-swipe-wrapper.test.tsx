import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MOCKS
// ============================================================================

const mockPush = vi.hoisted(() => vi.fn());
const mockGet = vi.hoisted(() => vi.fn((_key: string): string | null => null));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockPush }),
	useSearchParams: () => ({
		get: mockGet,
		toString: () => "",
	}),
}));

const mockHaptic = vi.hoisted(() => vi.fn());
vi.mock("@/shared/hooks/use-haptic", () => ({
	triggerHaptic: mockHaptic,
	useHaptic: () => mockHaptic,
}));

const mockIsMobile = vi.hoisted(() => vi.fn(() => true));
vi.mock("@/shared/hooks/use-mobile", () => ({
	useIsMobile: () => mockIsMobile(),
}));

import { DashboardPeriodSwipeWrapper } from "../dashboard-period-swipe-wrapper";

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

beforeEach(() => {
	mockIsMobile.mockReturnValue(true);
	mockGet.mockImplementation((_key: string) => null);
});

// ============================================================================
// HELPERS
// ============================================================================

function simulateSwipe(el: HTMLElement, fromX: number, toX: number, fromY = 100, toY = 100) {
	el.dispatchEvent(
		new TouchEvent("touchstart", {
			touches: [{ clientX: fromX, clientY: fromY } as Touch],
		}),
	);
	el.dispatchEvent(
		new TouchEvent("touchmove", {
			touches: [{ clientX: toX, clientY: toY } as Touch],
		}),
	);
	el.dispatchEvent(
		new TouchEvent("touchend", {
			changedTouches: [{ clientX: toX, clientY: toY } as Touch],
		}),
	);
}

// jsdom lacks TouchEvent — polyfill minimal version
if (typeof TouchEvent === "undefined") {
	class FakeTouchEvent extends Event {
		touches: Touch[];
		changedTouches: Touch[];
		constructor(type: string, init?: { touches?: Touch[]; changedTouches?: Touch[] } & EventInit) {
			super(type, init);
			this.touches = init?.touches ?? [];
			this.changedTouches = init?.changedTouches ?? [];
		}
	}
	// @ts-expect-error — polyfill in test env
	globalThis.TouchEvent = FakeTouchEvent;
}

// ============================================================================
// TESTS
// ============================================================================

describe("DashboardPeriodSwipeWrapper", () => {
	it("renders its children", () => {
		render(
			<DashboardPeriodSwipeWrapper>
				<p data-testid="child">hello</p>
			</DashboardPeriodSwipeWrapper>,
		);

		expect(screen.getByTestId("child")).toBeInTheDocument();
	});

	it("does not attach gesture handlers when not mobile", () => {
		mockIsMobile.mockReturnValue(false);

		render(
			<DashboardPeriodSwipeWrapper>
				<p>content</p>
			</DashboardPeriodSwipeWrapper>,
		);

		const wrapper = screen.getByTestId("dashboard-period-swipe");
		simulateSwipe(wrapper, 300, 100); // swipe left 200px

		expect(mockPush).not.toHaveBeenCalled();
		expect(mockHaptic).not.toHaveBeenCalled();
	});

	it("switches to the next period on a left swipe that clears the threshold", () => {
		mockGet.mockImplementation((key: string) => (key === "period" ? "30d" : null));

		render(
			<DashboardPeriodSwipeWrapper>
				<p>content</p>
			</DashboardPeriodSwipeWrapper>,
		);

		const wrapper = screen.getByTestId("dashboard-period-swipe");
		simulateSwipe(wrapper, 320, 100); // 220px left → next period ("30d" → "month")

		expect(mockPush).toHaveBeenCalledTimes(1);
		expect(mockHaptic).toHaveBeenCalledWith("selection");
	});

	it("switches to the previous period on a right swipe", () => {
		mockGet.mockImplementation((key: string) => (key === "period" ? "month" : null));

		render(
			<DashboardPeriodSwipeWrapper>
				<p>content</p>
			</DashboardPeriodSwipeWrapper>,
		);

		const wrapper = screen.getByTestId("dashboard-period-swipe");
		simulateSwipe(wrapper, 50, 300); // 250px right → prev period ("month" → "30d")

		expect(mockPush).toHaveBeenCalledTimes(1);
	});

	it("ignores sub-threshold swipes", () => {
		render(
			<DashboardPeriodSwipeWrapper>
				<p>content</p>
			</DashboardPeriodSwipeWrapper>,
		);

		const wrapper = screen.getByTestId("dashboard-period-swipe");
		simulateSwipe(wrapper, 100, 140); // 40px — under the 90px threshold

		expect(mockPush).not.toHaveBeenCalled();
	});

	it("cancels the gesture when the touch starts inside a data-no-swipe-nav region", () => {
		render(
			<DashboardPeriodSwipeWrapper>
				<div data-no-swipe-nav data-testid="protected">
					<span data-testid="protected-inner">Row 1 KPIs</span>
				</div>
			</DashboardPeriodSwipeWrapper>,
		);

		const inner = screen.getByTestId("protected-inner");
		simulateSwipe(inner, 300, 100);

		expect(mockPush).not.toHaveBeenCalled();
	});

	it("does not wrap around past the last period ('year')", () => {
		mockGet.mockImplementation((key: string) => (key === "period" ? "year" : null));

		render(
			<DashboardPeriodSwipeWrapper>
				<p>content</p>
			</DashboardPeriodSwipeWrapper>,
		);

		const wrapper = screen.getByTestId("dashboard-period-swipe");
		simulateSwipe(wrapper, 320, 100); // left swipe — no "next" beyond "year"

		expect(mockPush).not.toHaveBeenCalled();
	});

	it("does not wrap around before the first period ('7d')", () => {
		mockGet.mockImplementation((key: string) => (key === "period" ? "7d" : null));

		render(
			<DashboardPeriodSwipeWrapper>
				<p>content</p>
			</DashboardPeriodSwipeWrapper>,
		);

		const wrapper = screen.getByTestId("dashboard-period-swipe");
		simulateSwipe(wrapper, 50, 300); // right swipe — no "previous" before "7d"

		expect(mockPush).not.toHaveBeenCalled();
	});

	it("cancels the gesture when vertical movement dominates", () => {
		render(
			<DashboardPeriodSwipeWrapper>
				<p>content</p>
			</DashboardPeriodSwipeWrapper>,
		);

		const wrapper = screen.getByTestId("dashboard-period-swipe");
		// horizontal 100px but vertical 200px — vertical wins, gesture rejected
		simulateSwipe(wrapper, 100, 200, 100, 300);

		expect(mockPush).not.toHaveBeenCalled();
	});
});
