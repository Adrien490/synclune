import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type React from "react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockReducedMotion,
	mockAnnounce,
	mockHaptic,
	mockControlsStart,
	mockControlsStop,
	mockControls,
} = vi.hoisted(() => {
	const start = vi.fn();
	const stop = vi.fn();
	return {
		mockReducedMotion: { value: false },
		mockAnnounce: vi.fn(),
		mockHaptic: vi.fn(),
		mockControlsStart: start,
		mockControlsStop: stop,
		mockControls: { start, stop },
	};
});

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) =>
		args
			.flat()
			.filter((a) => typeof a === "string" && a.length > 0)
			.join(" "),
}));

vi.mock("@/shared/utils/toast", () => ({
	announceToScreenReader: mockAnnounce,
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	triggerHaptic: mockHaptic,
}));

vi.mock("motion/react", () => ({
	m: {
		div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
			<div {...(props as React.HTMLAttributes<HTMLDivElement>)}>{children}</div>
		),
		span: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
			<span {...(props as React.HTMLAttributes<HTMLSpanElement>)}>{children}</span>
		),
	},
	useReducedMotion: () => mockReducedMotion.value,
	useAnimationControls: () => mockControls,
}));

vi.mock("lucide-react", () => ({
	Undo2: ({ className }: { className?: string }) => (
		<svg data-testid="icon-undo" className={className} />
	),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		onClick,
		ref,
		...props
	}: React.PropsWithChildren<
		React.ButtonHTMLAttributes<HTMLButtonElement> & {
			ref?: React.Ref<HTMLButtonElement>;
		}
	>) => (
		<button
			ref={ref}
			onClick={onClick}
			{...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
		>
			{children}
		</button>
	),
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { Tombstone, TOMBSTONE_DURATION_MS } from "../tombstone";

// ============================================================================
// HELPERS
// ============================================================================

function renderTombstone(overrides: Partial<React.ComponentProps<typeof Tombstone>> = {}) {
	const onUndo = vi.fn();
	const onExpire = vi.fn();
	const utils = render(
		<Tombstone
			message="Bague Lune retirée du panier"
			onUndo={onUndo}
			onExpire={onExpire}
			{...overrides}
		/>,
	);
	return { ...utils, onUndo, onExpire };
}

// ============================================================================
// TESTS
// ============================================================================

afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

beforeEach(() => {
	vi.clearAllMocks();
	mockReducedMotion.value = false;
	vi.useFakeTimers({
		toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "Date"],
	});
});

describe("Tombstone", () => {
	it("exports default duration of 5000ms", () => {
		expect(TOMBSTONE_DURATION_MS).toBe(5000);
	});

	it("renders the message with title attribute (truncate fallback)", () => {
		renderTombstone();
		const messageSpan = screen.getByText("Bague Lune retirée du panier");
		expect(messageSpan).toHaveAttribute("title", "Bague Lune retirée du panier");
	});

	it("announces the message via the global SR live region on mount", () => {
		renderTombstone();
		expect(mockAnnounce).toHaveBeenCalledWith("Bague Lune retirée du panier", "polite");
	});

	it("renders the undo button with default 'Annuler' label", () => {
		renderTombstone();
		expect(screen.getByRole("button", { name: /annuler/i })).toBeInTheDocument();
	});

	it("uses undoAriaLabel when provided", () => {
		renderTombstone({ undoAriaLabel: "Annuler la suppression de Bague Lune" });
		expect(
			screen.getByRole("button", { name: "Annuler la suppression de Bague Lune" }),
		).toBeInTheDocument();
	});

	it("falls back to the simple undoLabel when undoAriaLabel is not provided", () => {
		renderTombstone();
		const btn = screen.getByRole("button");
		expect(btn).toHaveAttribute("aria-label", "Annuler");
	});

	it("calls onUndo and fires light haptic on button click; never calls onExpire", () => {
		const { onUndo, onExpire } = renderTombstone();
		fireEvent.click(screen.getByRole("button"));
		expect(onUndo).toHaveBeenCalledOnce();
		expect(mockHaptic).toHaveBeenCalledWith("light");
		act(() => {
			vi.advanceTimersByTime(TOMBSTONE_DURATION_MS + 1000);
		});
		expect(onExpire).not.toHaveBeenCalled();
	});

	it("calls onExpire after duration when no undo", () => {
		const { onUndo, onExpire } = renderTombstone();
		act(() => {
			vi.advanceTimersByTime(TOMBSTONE_DURATION_MS);
		});
		expect(onExpire).toHaveBeenCalledOnce();
		expect(onUndo).not.toHaveBeenCalled();
	});

	it("respects custom duration", () => {
		const { onExpire } = renderTombstone({ duration: 2000 });
		act(() => {
			vi.advanceTimersByTime(1999);
		});
		expect(onExpire).not.toHaveBeenCalled();
		act(() => {
			vi.advanceTimersByTime(1);
		});
		expect(onExpire).toHaveBeenCalledOnce();
	});

	it("guards against double-click triggering onUndo twice", () => {
		const { onUndo } = renderTombstone();
		const btn = screen.getByRole("button");
		fireEvent.click(btn);
		fireEvent.click(btn);
		expect(onUndo).toHaveBeenCalledOnce();
	});

	it("clears timer on unmount and never calls onExpire", () => {
		const { onExpire, unmount } = renderTombstone();
		unmount();
		act(() => {
			vi.advanceTimersByTime(TOMBSTONE_DURATION_MS + 1000);
		});
		expect(onExpire).not.toHaveBeenCalled();
	});

	it("pauses the timer on mouseenter and resumes on mouseleave", () => {
		const { container, onExpire } = renderTombstone({ duration: 3000 });
		const wrapper = container.querySelector("[data-slot='tombstone']") as HTMLElement;

		act(() => {
			vi.advanceTimersByTime(1000);
		});
		fireEvent.mouseEnter(wrapper);
		act(() => {
			vi.advanceTimersByTime(5000);
		});
		expect(onExpire).not.toHaveBeenCalled();

		fireEvent.mouseLeave(wrapper);
		act(() => {
			vi.advanceTimersByTime(1999);
		});
		expect(onExpire).not.toHaveBeenCalled();
		act(() => {
			vi.advanceTimersByTime(1);
		});
		expect(onExpire).toHaveBeenCalledOnce();
	});

	it("pauses on focusin and resumes on focusout", () => {
		const { container, onExpire } = renderTombstone({ duration: 2000 });
		const wrapper = container.querySelector("[data-slot='tombstone']") as HTMLElement;

		fireEvent.focusIn(wrapper);
		act(() => {
			vi.advanceTimersByTime(5000);
		});
		expect(onExpire).not.toHaveBeenCalled();

		fireEvent.focusOut(wrapper);
		act(() => {
			vi.advanceTimersByTime(2000);
		});
		expect(onExpire).toHaveBeenCalledOnce();
	});

	it("pauses on document.visibilitychange (hidden) and resumes on visible", () => {
		const { onExpire } = renderTombstone({ duration: 2000 });
		const visibilitySpy = vi.spyOn(document, "hidden", "get");

		visibilitySpy.mockReturnValue(true);
		fireEvent(document, new Event("visibilitychange"));
		act(() => {
			vi.advanceTimersByTime(5000);
		});
		expect(onExpire).not.toHaveBeenCalled();

		visibilitySpy.mockReturnValue(false);
		fireEvent(document, new Event("visibilitychange"));
		act(() => {
			vi.advanceTimersByTime(2000);
		});
		expect(onExpire).toHaveBeenCalledOnce();

		visibilitySpy.mockRestore();
	});

	it("focuses the undo button when autoFocus is true", () => {
		renderTombstone({ autoFocus: true });
		const btn = screen.getByRole("button");
		expect(document.activeElement).toBe(btn);
	});

	it("does not focus the undo button when autoFocus is false (default)", () => {
		renderTombstone();
		const btn = screen.getByRole("button");
		expect(document.activeElement).not.toBe(btn);
	});

	describe("reduced motion", () => {
		beforeEach(() => {
			mockReducedMotion.value = true;
		});

		it("renders sr-only countdown text", () => {
			renderTombstone({ duration: 3000 });
			expect(screen.getByText(/Expire dans 3 seconde/)).toBeInTheDocument();
		});

		it("decrements the sr-only countdown each second", () => {
			renderTombstone({ duration: 3000 });
			expect(screen.getByText(/Expire dans 3 seconde/)).toBeInTheDocument();
			act(() => {
				vi.advanceTimersByTime(1000);
			});
			expect(screen.getByText(/Expire dans 2 seconde/)).toBeInTheDocument();
			act(() => {
				vi.advanceTimersByTime(1000);
			});
			expect(screen.getByText(/Expire dans 1 seconde/)).toBeInTheDocument();
		});

		it("never calls controls.start when prefers-reduced-motion is active", () => {
			renderTombstone();
			expect(mockControlsStart).not.toHaveBeenCalled();
		});

		it("still calls onExpire after duration", () => {
			const { onExpire } = renderTombstone({ duration: 1500 });
			act(() => {
				vi.advanceTimersByTime(1500);
			});
			expect(onExpire).toHaveBeenCalledOnce();
		});
	});
});
