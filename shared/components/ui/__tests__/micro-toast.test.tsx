import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type React from "react";

const { mockReducedMotion, mockControls, capturedDragProps } = vi.hoisted(() => ({
	mockReducedMotion: { value: false as boolean | null },
	mockControls: { set: vi.fn(), start: vi.fn() },
	capturedDragProps: {
		onDragEnd: null as
			null | ((e: unknown, info: { offset: { y: number }; velocity: { y: number } }) => void),
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
		div: ({
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
			return <div {...(props as React.HTMLAttributes<HTMLDivElement>)}>{children}</div>;
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
		error: <span data-testid="icon-error" />,
		loading: <span data-testid="icon-loading" />,
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
		action: null,
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
		["error", "icon-error"],
		["loading", "icon-loading"],
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

	it("exposes a tap-to-dismiss button with an accessible label = message (content first, not action)", () => {
		useMicroToastStore.setState({
			visible: true,
			message: "Code promo appliqué",
			variant: "success",
			key: 1,
			count: 1,
			currentDuration: 1200,
		});
		render(<MicroToast />);
		const button = screen.getByRole("button", { name: /^Code promo appliqué$/i });
		expect(button).toBeTruthy();
		expect(button.getAttribute("aria-describedby")).toBe("micro-toast-hint");
		const hint = document.getElementById("micro-toast-hint");
		expect(hint).not.toBeNull();
		expect(hint?.textContent).toMatch(/appuyer pour fermer/i);
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
				variant: "error",
				key: 1,
				count: 1,
				currentDuration: 1200,
			});
			render(<MicroToast />);
			expect(screen.queryByText(/×/)).toBeNull();
		});

		it("renders the ×N badge when count > 1 on the error pill (présent treatment)", () => {
			useMicroToastStore.setState({
				visible: true,
				message: "Une erreur est survenue",
				variant: "error",
				key: 1,
				count: 3,
				currentDuration: 1200,
			});
			render(<MicroToast />);
			expect(screen.getByText("×3")).toBeTruthy();
		});

		it("does NOT render a visible ×N badge on a discreet variant, but keeps it in the accessible label", () => {
			useMicroToastStore.setState({
				visible: true,
				message: "Ajouté aux favoris",
				variant: "wishlist",
				key: 1,
				count: 3,
				currentDuration: 1200,
			});
			render(<MicroToast />);
			// Pas de pastille ×N visible en capsule discrète…
			expect(screen.queryByText("×3")).toBeNull();
			// …mais l'info de coalescing reste annoncée pour les lecteurs d'écran.
			expect(screen.getByRole("button", { name: /^Ajouté aux favoris \(×3\)$/i })).toBeTruthy();
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
			const button = screen.getByRole("button", { name: /^Ajouté \(×2\)$/i });
			expect(button).toBeTruthy();
		});
	});

	describe("discreet capsule vs error pill shape", () => {
		it.each(["success", "info", "warning", "loading", "wishlist", "cart", "discount"] as const)(
			"renders the %s variant as a rounded-full discreet capsule",
			(variant) => {
				useMicroToastStore.setState({
					visible: true,
					message: "Test",
					variant,
					key: 1,
					count: 1,
					currentDuration: 1200,
				});
				render(<MicroToast />);
				const btn = screen.getByRole("button");
				expect(btn.className).toContain("rounded-full");
				expect(btn.className).not.toContain("rounded-2xl");
			},
		);

		it("renders the error variant as the rounded-2xl présent pill", () => {
			useMicroToastStore.setState({
				visible: true,
				message: "Une erreur est survenue",
				variant: "error",
				key: 1,
				count: 1,
				currentDuration: 1200,
			});
			render(<MicroToast />);
			const btn = screen.getByRole("button");
			expect(btn.className).toContain("rounded-2xl");
			expect(btn.className).not.toContain("rounded-full");
		});
	});

	describe("progress bar (error pill only)", () => {
		it("starts the progress animation when the error toast becomes visible", () => {
			useMicroToastStore.setState({
				visible: true,
				message: "Une erreur est survenue",
				variant: "error",
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

		it("does NOT start the progress animation for a discreet variant (no countdown on a passive success)", () => {
			useMicroToastStore.setState({
				visible: true,
				message: "Ajouté",
				variant: "success",
				key: 1,
				count: 1,
				currentDuration: 1500,
			});
			render(<MicroToast />);
			expect(mockControls.set).not.toHaveBeenCalled();
			expect(mockControls.start).not.toHaveBeenCalled();
		});

		it("does NOT start the progress animation under reduced-motion", () => {
			mockReducedMotion.value = true;
			useMicroToastStore.setState({
				visible: true,
				message: "Reduced",
				variant: "error",
				key: 1,
				count: 1,
				currentDuration: 1200,
			});
			render(<MicroToast />);
			expect(mockControls.set).not.toHaveBeenCalled();
			expect(mockControls.start).not.toHaveBeenCalled();
		});
	});

	describe("inline action variant (undo mobile — discreet capsule)", () => {
		it("renders the « Annuler » button and NO dedicated dismiss « × » (discretion)", () => {
			useMicroToastStore.setState({
				visible: true,
				message: "Article archivé",
				variant: "success",
				key: 1,
				count: 1,
				currentDuration: 6000,
				action: { label: "Annuler", onClick: vi.fn() },
			});
			render(<MicroToast />);
			expect(screen.getByRole("button", { name: "Annuler" })).toBeTruthy();
			// Plus de croix « × » : fermeture via swipe-up / auto-dismiss.
			expect(screen.queryByRole("button", { name: /fermer la notification/i })).toBeNull();
		});

		it("calls action.onClick then hides when the action button is tapped", () => {
			const onClick = vi.fn();
			useMicroToastStore.setState({
				visible: true,
				message: "Article archivé",
				variant: "success",
				key: 1,
				count: 1,
				currentDuration: 6000,
				action: { label: "Annuler", onClick },
			});
			const { rerender } = render(<MicroToast />);
			fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
			rerender(<MicroToast />);
			expect(onClick).toHaveBeenCalledTimes(1);
			expect(useMicroToastStore.getState().visible).toBe(false);
		});

		it("dismisses via swipe-up WITHOUT firing the action", () => {
			const onClick = vi.fn();
			useMicroToastStore.setState({
				visible: true,
				message: "Article archivé",
				variant: "success",
				key: 1,
				count: 1,
				currentDuration: 6000,
				action: { label: "Annuler", onClick },
			});
			render(<MicroToast />);
			expect(capturedDragProps.onDragEnd).not.toBeNull();
			capturedDragProps.onDragEnd?.(null, { offset: { y: -60 }, velocity: { y: 0 } });
			expect(onClick).not.toHaveBeenCalled();
			expect(useMicroToastStore.getState().visible).toBe(false);
		});

		it("still dismisses via swipe-up in the action variant", () => {
			useMicroToastStore.setState({
				visible: true,
				message: "Article archivé",
				variant: "success",
				key: 1,
				count: 1,
				currentDuration: 6000,
				action: { label: "Annuler", onClick: vi.fn() },
			});
			render(<MicroToast />);
			expect(capturedDragProps.onDragEnd).not.toBeNull();
			capturedDragProps.onDragEnd?.(null, { offset: { y: -60 }, velocity: { y: 0 } });
			expect(useMicroToastStore.getState().visible).toBe(false);
		});
	});

	describe("contrast / forced-colors robustness (WCAG 1.4.11)", () => {
		it("ships opaque-background fallbacks for high-contrast and forced-colors modes", () => {
			useMicroToastStore.setState({
				visible: true,
				message: "Ajouté",
				variant: "success",
				key: 1,
				count: 1,
				currentDuration: 1200,
			});
			render(<MicroToast />);
			const cls = screen.getByRole("button").className;
			// prefers-contrast: more → fond opaque + bordure franche
			expect(cls).toContain("contrast-more:bg-background");
			expect(cls).toContain("contrast-more:border-foreground/40");
			// forced-colors (Windows High Contrast) → couleurs système
			expect(cls).toContain("forced-colors:bg-[Canvas]");
			expect(cls).toContain("forced-colors:text-[CanvasText]");
		});
	});

	describe("reduced-motion keeps swipe-to-dismiss (non-destructive close for undo)", () => {
		it("still dismisses the passive capsule via swipe-up under reduced-motion", () => {
			mockReducedMotion.value = true;
			useMicroToastStore.setState({
				visible: true,
				message: "Ajouté",
				variant: "success",
				key: 1,
				count: 1,
				currentDuration: 1200,
			});
			render(<MicroToast />);
			expect(capturedDragProps.onDragEnd).not.toBeNull();
			capturedDragProps.onDragEnd?.(null, { offset: { y: -60 }, velocity: { y: 0 } });
			expect(useMicroToastStore.getState().visible).toBe(false);
		});

		it("lets the undo variant be dismissed by swipe WITHOUT firing the action under reduced-motion", () => {
			mockReducedMotion.value = true;
			const onClick = vi.fn();
			useMicroToastStore.setState({
				visible: true,
				message: "Article archivé",
				variant: "success",
				key: 1,
				count: 1,
				currentDuration: 6000,
				action: { label: "Annuler", onClick },
			});
			render(<MicroToast />);
			expect(capturedDragProps.onDragEnd).not.toBeNull();
			capturedDragProps.onDragEnd?.(null, { offset: { y: -60 }, velocity: { y: 0 } });
			expect(onClick).not.toHaveBeenCalled();
			expect(useMicroToastStore.getState().visible).toBe(false);
		});
	});

	describe("portal mounting (escapes ancestor stacking contexts)", () => {
		it("renders the pastille as a direct child of document.body, not inside the test container", () => {
			useMicroToastStore.setState({
				visible: true,
				message: "Portal check",
				variant: "success",
				key: 1,
				count: 1,
				currentDuration: 1200,
			});
			const { container } = render(<MicroToast />);
			const button = screen.getByRole("button");
			// La pastille DOIT être hors du container de rendu (= portal vers body)
			expect(container.contains(button)).toBe(false);
			expect(document.body.contains(button)).toBe(true);
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
