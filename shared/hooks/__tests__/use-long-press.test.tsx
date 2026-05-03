import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockHaptic } = vi.hoisted(() => ({
	mockHaptic: vi.fn(),
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => mockHaptic,
}));

import { useLongPress } from "../use-long-press";

function Probe({
	onLongPress,
	onClick,
	trackPressing,
}: {
	onLongPress: () => void;
	onClick?: () => void;
	trackPressing?: boolean;
}) {
	const { bind, isPressing } = useLongPress(onLongPress, { onClick, trackPressing });
	return (
		<button type="button" data-testid="probe" data-pressing={isPressing} {...bind}>
			probe
		</button>
	);
}

function touch(x: number, y: number) {
	return [{ clientX: x, clientY: y } as Touch];
}

describe("useLongPress", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.clearAllMocks();
	});
	afterEach(() => {
		cleanup();
		vi.useRealTimers();
	});

	it("fires onLongPress + haptic 'medium' after 500ms hold", () => {
		const onLongPress = vi.fn();
		render(<Probe onLongPress={onLongPress} trackPressing />);
		const el = screen.getByTestId("probe");

		fireEvent.touchStart(el, { touches: touch(10, 10) });
		expect(el.dataset.pressing).toBe("true");

		act(() => {
			vi.advanceTimersByTime(500);
		});

		expect(onLongPress).toHaveBeenCalledTimes(1);
		expect(mockHaptic).toHaveBeenCalledWith("medium");
		expect(el.dataset.pressing).toBe("false");
	});

	it("does not fire when released before 500ms threshold", () => {
		const onLongPress = vi.fn();
		render(<Probe onLongPress={onLongPress} />);
		const el = screen.getByTestId("probe");

		fireEvent.touchStart(el, { touches: touch(10, 10) });
		act(() => {
			vi.advanceTimersByTime(300);
		});
		fireEvent.touchEnd(el);
		act(() => {
			vi.advanceTimersByTime(500);
		});

		expect(onLongPress).not.toHaveBeenCalled();
		expect(mockHaptic).not.toHaveBeenCalled();
	});

	it("cancels when finger moves more than 10px (scroll detection)", () => {
		const onLongPress = vi.fn();
		render(<Probe onLongPress={onLongPress} />);
		const el = screen.getByTestId("probe");

		fireEvent.touchStart(el, { touches: touch(50, 50) });
		fireEvent.touchMove(el, { touches: touch(50, 70) });
		act(() => {
			vi.advanceTimersByTime(500);
		});

		expect(onLongPress).not.toHaveBeenCalled();
	});

	it("does NOT cancel for movement under tolerance", () => {
		const onLongPress = vi.fn();
		render(<Probe onLongPress={onLongPress} />);
		const el = screen.getByTestId("probe");

		fireEvent.touchStart(el, { touches: touch(50, 50) });
		fireEvent.touchMove(el, { touches: touch(55, 53) });
		act(() => {
			vi.advanceTimersByTime(500);
		});

		expect(onLongPress).toHaveBeenCalledTimes(1);
	});

	it("auto-suppresses the click that follows a long-press (via bind.onClick wrapper)", () => {
		const onLongPress = vi.fn();
		const onClick = vi.fn();
		render(<Probe onLongPress={onLongPress} onClick={onClick} />);
		const el = screen.getByTestId("probe");

		fireEvent.touchStart(el, { touches: touch(10, 10) });
		act(() => {
			vi.advanceTimersByTime(500);
		});
		fireEvent.touchEnd(el);
		fireEvent.click(el);

		expect(onLongPress).toHaveBeenCalledTimes(1);
		expect(onClick).not.toHaveBeenCalled();
	});

	it("normal tap fires onClick", () => {
		const onLongPress = vi.fn();
		const onClick = vi.fn();
		render(<Probe onLongPress={onLongPress} onClick={onClick} />);
		const el = screen.getByTestId("probe");

		fireEvent.touchStart(el, { touches: touch(10, 10) });
		act(() => {
			vi.advanceTimersByTime(100);
		});
		fireEvent.touchEnd(el);
		fireEvent.click(el);

		expect(onLongPress).not.toHaveBeenCalled();
		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it("touchcancel clears the timer (browser interrupts gesture)", () => {
		const onLongPress = vi.fn();
		render(<Probe onLongPress={onLongPress} />);
		const el = screen.getByTestId("probe");

		fireEvent.touchStart(el, { touches: touch(10, 10) });
		fireEvent.touchCancel(el);
		act(() => {
			vi.advanceTimersByTime(500);
		});

		expect(onLongPress).not.toHaveBeenCalled();
	});

	it("does not fire haptic when haptic option = false", () => {
		function ProbeNoHaptic() {
			const { bind } = useLongPress(() => {}, { haptic: false });
			return <button type="button" data-testid="no-haptic" {...bind} />;
		}
		render(<ProbeNoHaptic />);
		fireEvent.touchStart(screen.getByTestId("no-haptic"), { touches: touch(0, 0) });
		act(() => {
			vi.advanceTimersByTime(500);
		});
		expect(mockHaptic).not.toHaveBeenCalled();
	});

	it("respects custom delay option", () => {
		const onLongPress = vi.fn();
		function ProbeFast() {
			const { bind } = useLongPress(onLongPress, { delay: 200 });
			return <button type="button" data-testid="fast" {...bind} />;
		}
		render(<ProbeFast />);
		fireEvent.touchStart(screen.getByTestId("fast"), { touches: touch(0, 0) });
		act(() => {
			vi.advanceTimersByTime(199);
		});
		expect(onLongPress).not.toHaveBeenCalled();
		act(() => {
			vi.advanceTimersByTime(1);
		});
		expect(onLongPress).toHaveBeenCalledTimes(1);
	});

	it("isPressing stays false by default (opt-in via trackPressing)", () => {
		render(<Probe onLongPress={() => {}} />);
		const el = screen.getByTestId("probe");
		fireEvent.touchStart(el, { touches: touch(0, 0) });
		expect(el.dataset.pressing).toBe("false");
	});

	it("bind.style injects touch-action + user-select", () => {
		render(<Probe onLongPress={() => {}} />);
		const el = screen.getByTestId("probe");
		expect(el.style.touchAction).toBe("manipulation");
		expect(el.style.userSelect).toBe("none");
	});

	it("contextmenu is suppressed after a long-press fires (Android)", () => {
		const onLongPress = vi.fn();
		render(<Probe onLongPress={onLongPress} />);
		const el = screen.getByTestId("probe");

		fireEvent.touchStart(el, { touches: touch(0, 0) });
		act(() => {
			vi.advanceTimersByTime(500);
		});
		const e = new Event("contextmenu", { bubbles: true, cancelable: true });
		const prevented = !el.dispatchEvent(e);
		expect(prevented).toBe(true);
	});

	it("contextmenu is NOT suppressed when no long-press has fired", () => {
		const onLongPress = vi.fn();
		render(<Probe onLongPress={onLongPress} />);
		const el = screen.getByTestId("probe");
		const e = new Event("contextmenu", { bubbles: true, cancelable: true });
		const prevented = !el.dispatchEvent(e);
		expect(prevented).toBe(false);
	});

	it("multi-cycle : long-press, release, then plain tap fires onClick (firedRef reset on next touchstart)", () => {
		const onLongPress = vi.fn();
		const onClick = vi.fn();
		render(<Probe onLongPress={onLongPress} onClick={onClick} />);
		const el = screen.getByTestId("probe");

		// Cycle 1 : long-press
		fireEvent.touchStart(el, { touches: touch(0, 0) });
		act(() => {
			vi.advanceTimersByTime(500);
		});
		fireEvent.touchEnd(el);
		fireEvent.click(el); // suppressed
		expect(onClick).not.toHaveBeenCalled();

		// Cycle 2 : plain tap (touchstart resets firedRef)
		fireEvent.touchStart(el, { touches: touch(0, 0) });
		act(() => {
			vi.advanceTimersByTime(100);
		});
		fireEvent.touchEnd(el);
		fireEvent.click(el);

		expect(onLongPress).toHaveBeenCalledTimes(1);
		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it("ref-sync : updated onLongPress closure is invoked even when handlers are stable", () => {
		function ProbeWithRefresh() {
			const [count, setCount] = useState(0);
			const { bind } = useLongPress(() => setCount((c) => c + 10));
			return (
				<button type="button" data-testid="ref-sync" data-count={count} {...bind}>
					{count}
				</button>
			);
		}
		render(<ProbeWithRefresh />);
		const el = screen.getByTestId("ref-sync");

		fireEvent.touchStart(el, { touches: touch(0, 0) });
		act(() => {
			vi.advanceTimersByTime(500);
		});
		expect(el.dataset.count).toBe("10");

		fireEvent.touchStart(el, { touches: touch(0, 0) });
		act(() => {
			vi.advanceTimersByTime(500);
		});
		// Confirms closure read latest setCount + state correctly
		expect(el.dataset.count).toBe("20");
	});
});
