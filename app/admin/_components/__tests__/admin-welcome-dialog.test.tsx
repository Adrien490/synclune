import type React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, act, waitFor } from "@testing-library/react";

import { ActionStatus } from "@/shared/types/server-action";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockMarkWelcomeShown, mockToast, mockHaptic, mockIsMobile } = vi.hoisted(() => ({
	mockMarkWelcomeShown: vi.fn(),
	mockToast: { success: vi.fn(), error: vi.fn() },
	mockHaptic: vi.fn(),
	mockIsMobile: { value: false },
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("motion/react", () => {
	const { forwardRef: fRef, createElement } = require("react");
	return {
		m: {
			div: fRef(
				(
					{
						children,
						initial: _i,
						animate: _a,
						exit: _e,
						transition: _t,
						...props
					}: Record<string, unknown> & { children?: unknown },
					ref: unknown,
				) => createElement("div", { ref, ...props }, children),
			),
		},
		useReducedMotion: vi.fn(() => false),
	};
});

vi.mock("@/modules/auth/actions/mark-welcome-shown", () => ({
	markWelcomeShown: mockMarkWelcomeShown,
}));

vi.mock("@/shared/utils/toast", () => ({ toast: mockToast }));

vi.mock("@/shared/hooks/use-haptic", () => ({ useHaptic: () => mockHaptic }));

vi.mock("@/shared/hooks/use-mobile", () => ({
	useIsMobile: () => mockIsMobile.value,
}));

// Render ResponsiveDialog children inline (skip Radix/Vaul portal complexity)
vi.mock("@/shared/components/responsive-dialog", () => {
	const { createElement, isValidElement, cloneElement, Fragment } = require("react");

	// asChild → render the only child unchanged (Radix Slot semantics)
	const slotLike = (fallbackTag: string) => {
		const Comp = ({
			children,
			asChild,
			...props
		}: Record<string, unknown> & { children?: unknown; asChild?: boolean }) => {
			if (asChild && isValidElement(children)) {
				return cloneElement(children as React.ReactElement, props);
			}
			return createElement(fallbackTag, props, children);
		};
		return Comp;
	};

	return {
		ResponsiveDialog: ({
			children,
			open,
		}: {
			children: React.ReactNode;
			open: boolean;
			onOpenChange?: (open: boolean) => void;
		}) =>
			open ? createElement("div", { role: "dialog" }, children) : createElement(Fragment, null),
		ResponsiveDialogContent: ({
			children,
			onPointerDownOutside: _p,
			onEscapeKeyDown: _e,
			...props
		}: Record<string, unknown> & { children?: unknown }) => createElement("div", props, children),
		ResponsiveDialogTitle: slotLike("h2"),
		ResponsiveDialogDescription: slotLike("p"),
	};
});

// Render Sheet children inline so SheetHandle is visible in the mobile branch
vi.mock("@/shared/components/ui/sheet", () => {
	const { createElement, Fragment } = require("react");
	return {
		Sheet: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
			open ? createElement("div", { role: "dialog" }, children) : createElement(Fragment, null),
		SheetContent: ({
			children,
			showCloseButton: _s,
			...props
		}: Record<string, unknown> & { children?: unknown }) => createElement("div", props, children),
		SheetHandle: () =>
			createElement("div", {
				"data-slot": "sheet-handle",
				className: "h-1.5 w-10",
			}),
		SheetTitle: ({
			children,
			asChild: _a,
			...props
		}: Record<string, unknown> & { children?: unknown }) => createElement("h2", props, children),
		SheetDescription: ({ children, ...props }: Record<string, unknown> & { children?: unknown }) =>
			createElement("p", props, children),
	};
});

vi.mock("@/shared/components/ui/button", () => {
	const { forwardRef: fRef, createElement } = require("react");
	return {
		Button: fRef(
			(
				{
					children,
					size: _s,
					variant: _v,
					...props
				}: Record<string, unknown> & { children?: unknown },
				ref: unknown,
			) => createElement("button", { ref, ...props }, children),
		),
	};
});

vi.mock("next/image", () => {
	const { createElement } = require("react");
	return {
		default: ({
			src,
			alt,
			fill: _f,
			sizes: _sz,
			preload: _pr,
			...props
		}: Record<string, unknown> & { src: string; alt: string }) =>
			createElement("img", { src, alt, ...props }),
	};
});

import { AdminWelcomeDialog } from "../admin-welcome-dialog";

// ============================================================================
// TESTS
// ============================================================================

describe("AdminWelcomeDialog", () => {
	beforeEach(() => {
		cleanup();
		mockMarkWelcomeShown.mockReset();
		mockToast.success.mockReset();
		mockToast.error.mockReset();
		mockHaptic.mockReset();
		mockIsMobile.value = false;
		mockMarkWelcomeShown.mockResolvedValue({ status: ActionStatus.SUCCESS, message: "ok" });
	});

	afterEach(() => {
		cleanup();
	});

	it("renders the personalized greeting in the heading", () => {
		render(<AdminWelcomeDialog />);

		const heading = screen.getByRole("heading", { level: 2 });
		expect(heading.textContent).toContain("Coucou Lélé");
	});

	it("renders the photo with descriptive alt text", () => {
		render(<AdminWelcomeDialog />);

		const photo = screen.getByRole("img", { name: /adri et lélé/i });
		expect(photo.getAttribute("src")).toBe("/adri-lele.jpg");
	});

	it("triggers a 'success' haptic when the dialog mounts", () => {
		render(<AdminWelcomeDialog />);

		expect(mockHaptic).toHaveBeenCalledWith("success");
	});

	it("calls markWelcomeShown when the user clicks the dismiss button", async () => {
		render(<AdminWelcomeDialog />);

		const button = screen.getByRole("button", { name: /merci adri/i });
		await act(async () => {
			fireEvent.click(button);
		});

		expect(mockMarkWelcomeShown).toHaveBeenCalledOnce();
		await waitFor(() => {
			expect(mockHaptic).toHaveBeenCalledWith("success");
		});
		expect(mockToast.error).not.toHaveBeenCalled();
	});

	it("keeps the dialog open and shows an error toast when the action fails", async () => {
		mockMarkWelcomeShown.mockResolvedValue({
			status: ActionStatus.ERROR,
			message: "Échec serveur",
		});

		render(<AdminWelcomeDialog />);

		const button = screen.getByRole("button", { name: /merci adri/i });
		await act(async () => {
			fireEvent.click(button);
		});

		await waitFor(() => {
			expect(mockToast.error).toHaveBeenCalledWith("Échec serveur");
		});
		expect(mockToast.success).not.toHaveBeenCalled();
		// Dialog still rendered (open === true)
		expect(screen.getByRole("dialog")).toBeTruthy();
	});

	it("flips aria-busy on the button while the action is pending", async () => {
		let resolveAction: (v: { status: ActionStatus; message: string }) => void = () => {};
		mockMarkWelcomeShown.mockImplementation(
			() =>
				new Promise<{ status: ActionStatus; message: string }>((resolve) => {
					resolveAction = resolve;
				}),
		);

		render(<AdminWelcomeDialog />);

		const button = screen.getByRole("button", { name: /merci adri/i });
		expect(button.getAttribute("aria-busy")).toBe("false");

		await act(async () => {
			fireEvent.click(button);
		});

		// During pending : aria-busy true, button disabled
		const pendingButton = screen.getByRole("button");
		expect(pendingButton.getAttribute("aria-busy")).toBe("true");
		expect((pendingButton as HTMLButtonElement).disabled).toBe(true);

		// Resolve and let React flush
		await act(async () => {
			resolveAction({ status: ActionStatus.SUCCESS, message: "ok" });
		});
	});

	it("renders a visual handle on mobile viewports only", () => {
		mockIsMobile.value = true;
		const { container } = render(<AdminWelcomeDialog />);
		expect(container.querySelector(".h-1\\.5.w-10")).toBeTruthy();
	});

	it("does not render the visual handle on desktop viewports", () => {
		mockIsMobile.value = false;
		const { container } = render(<AdminWelcomeDialog />);
		expect(container.querySelector(".h-1\\.5.w-10")).toBeNull();
	});

	it("restores focus to the previously active element after a successful dismiss", async () => {
		// Mount a trigger button outside the dialog and focus it
		const trigger = document.createElement("button");
		trigger.textContent = "trigger";
		document.body.appendChild(trigger);
		trigger.focus();
		expect(document.activeElement).toBe(trigger);

		render(<AdminWelcomeDialog />);

		const dismiss = screen.getByRole("button", { name: /merci adri/i });
		await act(async () => {
			fireEvent.click(dismiss);
		});

		// Wait for action + rAF to settle
		await waitFor(() => {
			expect(mockMarkWelcomeShown).toHaveBeenCalledOnce();
		});
		await act(async () => {
			await new Promise((r) => requestAnimationFrame(() => r(undefined)));
		});

		expect(document.activeElement).toBe(trigger);
		document.body.removeChild(trigger);
	});
});
