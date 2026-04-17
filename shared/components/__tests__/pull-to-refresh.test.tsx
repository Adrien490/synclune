import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockUseRouter, mockUseIsTouchDevice, mockUseReducedMotion, mockTriggerHaptic } = vi.hoisted(
	() => ({
		mockUseRouter: vi.fn(),
		mockUseIsTouchDevice: vi.fn(),
		mockUseReducedMotion: vi.fn(),
		mockTriggerHaptic: vi.fn(),
	}),
);

vi.mock("next/navigation", () => ({ useRouter: mockUseRouter }));
vi.mock("@/shared/hooks/use-touch-device", () => ({ useIsTouchDevice: mockUseIsTouchDevice }));
vi.mock("@/shared/hooks/use-haptic", () => ({ triggerHaptic: mockTriggerHaptic }));
vi.mock("motion/react", () => ({ useReducedMotion: mockUseReducedMotion }));

import { PullToRefresh } from "../pull-to-refresh";

afterEach(cleanup);

describe("PullToRefresh", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUseRouter.mockReturnValue({ refresh: vi.fn() });
		mockUseReducedMotion.mockReturnValue(false);
	});

	describe("touch detection", () => {
		it("renders nothing when device is not touch-capable", () => {
			mockUseIsTouchDevice.mockReturnValue(false);

			const { container } = render(<PullToRefresh />);

			expect(container.firstChild).toBeNull();
		});

		it("renders the indicator container on touch devices", () => {
			mockUseIsTouchDevice.mockReturnValue(true);

			const { container } = render(<PullToRefresh />);

			expect(container.firstChild).not.toBeNull();
		});
	});

	describe("touch event listeners", () => {
		it("registers touchstart, touchmove, touchend, touchcancel listeners on mount", () => {
			mockUseIsTouchDevice.mockReturnValue(true);
			const addSpy = vi.spyOn(window, "addEventListener");

			render(<PullToRefresh />);

			const events = addSpy.mock.calls.map((c) => c[0]);
			expect(events).toContain("touchstart");
			expect(events).toContain("touchmove");
			expect(events).toContain("touchend");
			expect(events).toContain("touchcancel");
		});

		it("does NOT register listeners when not touch", () => {
			mockUseIsTouchDevice.mockReturnValue(false);
			const addSpy = vi.spyOn(window, "addEventListener");

			render(<PullToRefresh />);

			const events = addSpy.mock.calls.map((c) => c[0]);
			expect(events).not.toContain("touchstart");
		});

		it("removes listeners on unmount", () => {
			mockUseIsTouchDevice.mockReturnValue(true);
			const removeSpy = vi.spyOn(window, "removeEventListener");

			const { unmount } = render(<PullToRefresh />);
			unmount();

			const removed = removeSpy.mock.calls.map((c) => c[0]);
			expect(removed).toContain("touchstart");
			expect(removed).toContain("touchmove");
			expect(removed).toContain("touchend");
			expect(removed).toContain("touchcancel");
		});
	});

	describe("indicator a11y", () => {
		beforeEach(() => {
			mockUseIsTouchDevice.mockReturnValue(true);
		});

		it("indicator has role=status and aria-live=polite", () => {
			const { container } = render(<PullToRefresh />);

			const indicator = container.querySelector('[role="status"]');
			expect(indicator).not.toBeNull();
			expect(indicator).toHaveAttribute("aria-live", "polite");
		});

		it("indicator is aria-hidden=true when not refreshing", () => {
			const { container } = render(<PullToRefresh />);

			const indicator = container.querySelector('[role="status"]');
			expect(indicator).toHaveAttribute("aria-hidden", "true");
		});
	});

	describe("reduced motion", () => {
		beforeEach(() => {
			mockUseIsTouchDevice.mockReturnValue(true);
		});

		it("uses opacity-only transition when prefers-reduced-motion is on", () => {
			mockUseReducedMotion.mockReturnValue(true);

			const { container } = render(<PullToRefresh />);

			const indicator = container.querySelector('[role="status"]') as HTMLElement;
			expect(indicator.style.transition).toContain("opacity");
			expect(indicator.style.transition).not.toContain("transform");
		});

		it("uses transform + opacity transition when reduced-motion is off", () => {
			mockUseReducedMotion.mockReturnValue(false);

			const { container } = render(<PullToRefresh />);

			const indicator = container.querySelector('[role="status"]') as HTMLElement;
			expect(indicator.style.transition).toContain("transform");
			expect(indicator.style.transition).toContain("opacity");
		});
	});
});
