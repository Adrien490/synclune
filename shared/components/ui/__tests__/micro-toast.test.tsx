import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type React from "react";

const { mockReducedMotion, mockControls, capturedDragProps } = vi.hoisted(() => ({
	mockReducedMotion: { value: false as boolean | null },
	mockControls: { set: vi.fn(), start: vi.fn() },
	capturedDragProps: {
		onDragEnd: null as
			| null
			| ((e: unknown, info: { offset: { y: number }; velocity: { y: number } }) => void),
	},
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) =>
		args
			.flat()
			.filter((a) => typeof a === "string" && a.length > 0)
			.join(" "),
}));

vi.mock("motion/react", () => ({
	AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
	m: {
		button: ({
			children,
			initial: _initial,
			animate: _animate,
			exit: _exit,
			transition: _transition,
			drag: _drag,
			dragConstraints: _dragConstraints,
			dragElastic: _dragElastic,
			dragMomentum: _dragMomentum,
			onDragEnd,
			...props
		}: React.PropsWithChildren<Record<string, unknown>>) => {
			capturedDragProps.onDragEnd = onDragEnd as never;
			return (
				<button {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}>{children}</button>
			);
		},
		span: ({
			children,
			initial: _initial,
			animate: _animate,
			...props
		}: React.PropsWithChildren<Record<string, unknown>>) => (
			<span {...(props as React.HTMLAttributes<HTMLSpanElement>)}>{children}</span>
		),
	},
	useReducedMotion: () => mockReducedMotion.value,
	useAnimationControls: () => mockControls,
}));

vi.mock("@/shared/components/animations/motion.config", () => ({
	MOTION_CONFIG: {
		spring: { toast: { type: "spring", stiffness: 380, damping: 28 } },
	},
}));

vi.mock("@/shared/components/ui/toast-icons", () => ({
	toastIcons: {
		success: <span data-testid="icon-success" />,
		info: <span data-testid="icon-info" />,
		warning: <span data-testid="icon-warning" />,
		wishlist: <span data-testid="icon-wishlist" />,
		cart: <span data-testid="icon-cart" />,
		discount: <span data-testid="icon-discount" />,
	},
}));

import { MicroToast } from "@/shared/components/ui/micro-toast";
import { useMicroToastStore } from "@/shared/stores/micro-toast-store";

afterEach(() => {
	cleanup();
	vi.useRealTimers();
	capturedDragProps.onDragEnd = null;
	mockControls.set.mockClear();
	mockControls.start.mockClear();
});

beforeEach(() => {
	mockReducedMotion.value = false;
	useMicroToastStore.setState({
		visible: false,
		message: "",
		variant: "success",
		key: 0,
		count: 1,
		currentDuration: 1200,
	});
});

describe("<MicroToast />", () => {
	it("renders nothing when the store is hidden", () => {
		render(<MicroToast />);
		expect(screen.queryByRole("button")).toBeNull();
	});

	it("renders the message and success icon when visible", () => {
		useMicroToastStore.setState({
			visible: true,
			message: "Ajouté aux favoris",
			variant: "success",
			key: 1,
			count: 1,
			currentDuration: 1200,
		});
		render(<MicroToast />);
		expect(screen.getByText("Ajouté aux favoris")).toBeTruthy();
		expect(screen.getByTestId("icon-success")).toBeTruthy();
	});

	it.each([
		["success", "icon-success"],
		["info", "icon-info"],
		["warning", "icon-warning"],
		["wishlist", "icon-wishlist"],
		["cart", "icon-cart"],
		["discount", "icon-discount"],
	] as const)("renders the %s variant icon", (variant, iconTestId) => {
		useMicroToastStore.setState({
			visible: true,
			message: "Test",
			variant,
			key: 1,
			count: 1,
			currentDuration: 1200,
		});
		render(<MicroToast />);
		expect(screen.getByTestId(iconTestId)).toBeTruthy();
	});

	it("exposes a tap-to-dismiss button with an accessible label including the message", () => {
		useMicroToastStore.setState({
			visible: true,
			message: "Code promo appliqué",
			variant: "success",
			key: 1,
			count: 1,
			currentDuration: 1200,
		});
		render(<MicroToast />);
		const button = screen.getByRole("button", {
			name: /Fermer la notification : Code promo appliqué/i,
		});
		expect(button).toBeTruthy();
	});

	it("calls hide() when tapped", () => {
		vi.useFakeTimers();
		useMicroToastStore.getState().show("Hello", "success");
		const { rerender } = render(<MicroToast />);
		expect(useMicroToastStore.getState().visible).toBe(true);
		fireEvent.click(screen.getByRole("button"));
		rerender(<MicroToast />);
		expect(useMicroToastStore.getState().visible).toBe(false);
	});

	it("respects reduced-motion (no animation props passed)", () => {
		mockReducedMotion.value = true;
		useMicroToastStore.setState({
			visible: true,
			message: "Reduced",
			variant: "info",
			key: 1,
			count: 1,
			currentDuration: 1200,
		});
		render(<MicroToast />);
		const btn = screen.getByRole("button");
		expect(btn).toBeTruthy();
	});

	describe("count coalesce display", () => {
		it("does NOT render the ×N badge when count === 1", () => {
			useMicroToastStore.setState({
				visible: true,
				message: "Notif",
				variant: "success",
				key: 1,
				count: 1,
				currentDuration: 1200,
			});
			render(<MicroToast />);
			expect(screen.queryByText(/×/)).toBeNull();
		});

		it("renders the ×N badge when count > 1", () => {
			useMicroToastStore.setState({
				visible: true,
				message: "Ajouté aux favoris",
				variant: "wishlist",
				key: 1,
				count: 3,
				currentDuration: 1200,
			});
			render(<MicroToast />);
			expect(screen.getByText("×3")).toBeTruthy();
		});

		it("includes the count in the accessible label when > 1", () => {
			useMicroToastStore.setState({
				visible: true,
				message: "Ajouté",
				variant: "wishlist",
				key: 1,
				count: 2,
				currentDuration: 1200,
			});
			render(<MicroToast />);
			const button = screen.getByRole("button", {
				name: /Fermer la notification : Ajouté \(×2\)/i,
			});
			expect(button).toBeTruthy();
		});
	});

	describe("progress bar", () => {
		it("starts the progress animation when the toast becomes visible", () => {
			useMicroToastStore.setState({
				visible: true,
				message: "Test",
				variant: "success",
				key: 1,
				count: 1,
				currentDuration: 1500,
			});
			render(<MicroToast />);
			expect(mockControls.set).toHaveBeenCalledWith({ scaleX: 1 });
			expect(mockControls.start).toHaveBeenCalledWith({
				scaleX: 0,
				transition: { duration: 1.5, ease: "linear" },
			});
		});

		it("does NOT start the progress animation under reduced-motion", () => {
			mockReducedMotion.value = true;
			useMicroToastStore.setState({
				visible: true,
				message: "Reduced",
				variant: "info",
				key: 1,
				count: 1,
				currentDuration: 1200,
			});
			render(<MicroToast />);
			expect(mockControls.set).not.toHaveBeenCalled();
			expect(mockControls.start).not.toHaveBeenCalled();
		});
	});

	describe("swipe-up to dismiss (G1)", () => {
		it("calls hide() when offset.y exceeds the threshold", () => {
			vi.useFakeTimers();
			useMicroToastStore.getState().show("Swipe me", "success");
			render(<MicroToast />);
			expect(capturedDragProps.onDragEnd).not.toBeNull();
			capturedDragProps.onDragEnd?.(null, { offset: { y: -60 }, velocity: { y: 0 } });
			expect(useMicroToastStore.getState().visible).toBe(false);
		});

		it("calls hide() when velocity.y exceeds the threshold", () => {
			vi.useFakeTimers();
			useMicroToastStore.getState().show("Flick", "success");
			render(<MicroToast />);
			capturedDragProps.onDragEnd?.(null, { offset: { y: -10 }, velocity: { y: -500 } });
			expect(useMicroToastStore.getState().visible).toBe(false);
		});

		it("does NOT hide when below both thresholds (tap-like, no-op)", () => {
			vi.useFakeTimers();
			useMicroToastStore.getState().show("Stay", "success");
			render(<MicroToast />);
			capturedDragProps.onDragEnd?.(null, { offset: { y: -10 }, velocity: { y: -100 } });
			expect(useMicroToastStore.getState().visible).toBe(true);
		});
	});
});
