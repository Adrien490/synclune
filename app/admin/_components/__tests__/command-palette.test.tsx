import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as LucideReact from "lucide-react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockToggle,
	mockClose,
	mockOpen,
	mockIsOpen,
	mockRouterPush,
	mockIsMobile,
	mockPathname,
	mockTriggerHaptic,
} = vi.hoisted(() => ({
	mockToggle: vi.fn(),
	mockClose: vi.fn(),
	mockOpen: vi.fn(),
	mockIsOpen: { current: false },
	mockRouterPush: vi.fn(),
	mockIsMobile: { current: false },
	mockPathname: { current: "/admin" },
	mockTriggerHaptic: vi.fn(),
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("lucide-react", async (importOriginal) => {
	const actual = await importOriginal<typeof LucideReact>();
	return {
		...actual,
		Plus: (props: Record<string, unknown>) => <svg data-testid="icon-plus" {...props} />,
		Layers: (props: Record<string, unknown>) => <svg data-testid="icon-layers" {...props} />,
		Ticket: (props: Record<string, unknown>) => <svg data-testid="icon-ticket" {...props} />,
		CircleHelp: (props: Record<string, unknown>) => <svg data-testid="icon-help" {...props} />,
		Megaphone: (props: Record<string, unknown>) => <svg data-testid="icon-megaphone" {...props} />,
	};
});

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockRouterPush }),
	usePathname: () => mockPathname.current,
}));

vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: () => ({
		isOpen: mockIsOpen.current,
		open: mockOpen,
		close: mockClose,
		toggle: mockToggle,
	}),
}));

vi.mock("@/shared/hooks/use-mobile", () => ({
	useIsMobile: () => mockIsMobile.current,
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	triggerHaptic: mockTriggerHaptic,
}));

vi.mock("@/shared/components/scroll-fade", () => ({
	default: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="scroll-fade">{children}</div>
	),
}));

vi.mock("@/shared/components/ui/command", () => ({
	CommandDialog: ({
		children,
		open,
		title,
		description,
		onOpenChange,
	}: {
		children: React.ReactNode;
		open: boolean;
		onOpenChange: (v: boolean) => void;
		title: string;
		description: string;
	}) => (
		<>
			<button
				type="button"
				data-testid="dialog-trigger-open"
				hidden={open}
				onClick={() => onOpenChange(true)}
				aria-label="Open dialog"
			/>
			<button
				type="button"
				data-testid="dialog-trigger-close"
				hidden={!open}
				onClick={() => onOpenChange(false)}
				aria-label="Close dialog"
			/>
			{open ? (
				<div data-testid="command-dialog" aria-label={title} aria-description={description}>
					{children}
				</div>
			) : null}
		</>
	),
	CommandDrawer: ({
		children,
		open,
		title,
		description,
		onOverlayClick,
		onOpenChange,
	}: {
		children: React.ReactNode;
		open: boolean;
		onOpenChange: (v: boolean) => void;
		title: string;
		description?: string;
		onOverlayClick?: React.MouseEventHandler<HTMLDivElement>;
	}) => (
		<>
			<button
				type="button"
				data-testid="drawer-trigger-open"
				hidden={open}
				onClick={() => onOpenChange(true)}
				aria-label="Open drawer"
			/>
			{open ? (
				<div data-testid="command-drawer" aria-label={title} aria-description={description}>
					<div
						data-testid="drawer-overlay"
						onClick={onOverlayClick}
						onKeyDown={(e) => {
							if (e.key === "Enter" || e.key === " ") {
								onOverlayClick?.(e as unknown as React.MouseEvent<HTMLDivElement>);
							}
						}}
						aria-label="Overlay"
						role="button"
						tabIndex={0}
					/>
					<button
						type="button"
						data-testid="drawer-close"
						onClick={() => onOpenChange(false)}
						aria-label="Close drawer"
					/>
					{children}
				</div>
			) : null}
		</>
	),
	CommandEmpty: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="command-empty">{children}</div>
	),
	CommandGroup: ({ children, heading }: { children: React.ReactNode; heading: string }) => (
		<div data-testid="command-group" data-heading={heading}>
			<p>{heading}</p>
			{children}
		</div>
	),
	CommandInput: ({
		placeholder,
		inputMode,
		enterKeyHint,
		...rest
	}: React.InputHTMLAttributes<HTMLInputElement>) => (
		<input
			data-testid="command-input"
			placeholder={placeholder}
			data-inputmode={inputMode}
			data-enterkeyhint={enterKeyHint}
			{...rest}
		/>
	),
	CommandItem: ({
		children,
		onSelect,
		value,
	}: {
		children: React.ReactNode;
		onSelect: () => void;
		value: string;
	}) => (
		<div
			data-testid="command-item"
			data-value={value}
			onClick={onSelect}
			onKeyDown={(e) => e.key === "Enter" && onSelect()}
			role="option"
			tabIndex={0}
			aria-selected={false}
		>
			{children}
		</div>
	),
	CommandList: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div data-testid="command-list" data-class={className}>
			{children}
		</div>
	),
	CommandSeparator: () => <hr data-testid="command-separator" />,
}));

import { CommandPalette } from "../command-palette";

// ============================================================================
// SETUP
// ============================================================================

beforeEach(() => {
	vi.clearAllMocks();
	mockIsOpen.current = false;
	mockIsMobile.current = false;
	mockPathname.current = "/admin";
});

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("CommandPalette", () => {
	describe("keyboard shortcut", () => {
		it("adds keydown listener on mount", () => {
			const spy = vi.spyOn(document, "addEventListener");
			render(<CommandPalette />);
			expect(spy).toHaveBeenCalledWith("keydown", expect.any(Function));
			spy.mockRestore();
		});

		it("removes keydown listener on unmount", () => {
			const spy = vi.spyOn(document, "removeEventListener");
			const { unmount } = render(<CommandPalette />);
			unmount();
			expect(spy).toHaveBeenCalledWith("keydown", expect.any(Function));
			spy.mockRestore();
		});

		it("toggles on Cmd+K", () => {
			render(<CommandPalette />);
			fireEvent.keyDown(document, { key: "k", metaKey: true });
			expect(mockToggle).toHaveBeenCalledTimes(1);
		});

		it("toggles on Ctrl+K", () => {
			render(<CommandPalette />);
			fireEvent.keyDown(document, { key: "k", ctrlKey: true });
			expect(mockToggle).toHaveBeenCalledTimes(1);
		});

		it("does not toggle on K without modifier", () => {
			render(<CommandPalette />);
			fireEvent.keyDown(document, { key: "k" });
			expect(mockToggle).not.toHaveBeenCalled();
		});
	});

	describe("when closed", () => {
		it("does not render dialog content (desktop)", () => {
			mockIsOpen.current = false;
			mockIsMobile.current = false;
			render(<CommandPalette />);
			expect(screen.queryByTestId("command-dialog")).not.toBeInTheDocument();
			expect(screen.queryByTestId("command-drawer")).not.toBeInTheDocument();
		});

		it("does not render drawer content (mobile)", () => {
			mockIsOpen.current = false;
			mockIsMobile.current = true;
			render(<CommandPalette />);
			expect(screen.queryByTestId("command-drawer")).not.toBeInTheDocument();
			expect(screen.queryByTestId("command-dialog")).not.toBeInTheDocument();
		});
	});

	describe("desktop — when open", () => {
		beforeEach(() => {
			mockIsOpen.current = true;
			mockIsMobile.current = false;
		});

		it("renders the CommandDialog (not Drawer)", () => {
			render(<CommandPalette />);
			expect(screen.getByTestId("command-dialog")).toBeInTheDocument();
			expect(screen.queryByTestId("command-drawer")).not.toBeInTheDocument();
		});

		it("renders search input with placeholder", () => {
			render(<CommandPalette />);
			expect(screen.getByTestId("command-input")).toHaveAttribute(
				"placeholder",
				"Rechercher une page ou une action...",
			);
		});

		it("renders the ⌘K keyboard hint", () => {
			render(<CommandPalette />);
			const kbd = screen.getByText("K", { selector: "kbd" });
			expect(kbd).toBeInTheDocument();
			expect(kbd).toHaveAttribute("aria-hidden", "true");
			expect(kbd.className).toContain("sm:inline-flex");
			expect(kbd.className).toContain("hidden");
		});

		it("does NOT apply mobile-only input attributes", () => {
			render(<CommandPalette />);
			const input = screen.getByTestId("command-input");
			expect(input).not.toHaveAttribute("data-inputmode", "search");
			expect(input).not.toHaveAttribute("data-enterkeyhint", "search");
		});

		it("renders quick actions group", () => {
			render(<CommandPalette />);
			expect(screen.getByText("Actions rapides")).toBeInTheDocument();
		});

		it("renders 4 quick actions", () => {
			render(<CommandPalette />);
			expect(screen.getByText("Nouveau produit")).toBeInTheDocument();
			expect(screen.getByText("Nouvelle collection")).toBeInTheDocument();
			expect(screen.getByText("Nouveau code promo")).toBeInTheDocument();
			expect(screen.getByText("Nouvelle annonce")).toBeInTheDocument();
		});

		it("renders navigation groups", () => {
			render(<CommandPalette />);
			expect(screen.getByText("Ventes")).toBeInTheDocument();
			expect(screen.getByText("Catalogue")).toBeInTheDocument();
			expect(screen.getByText("Marketing")).toBeInTheDocument();
		});

		it("renders empty state text", () => {
			render(<CommandPalette />);
			expect(screen.getByText("Aucun resultat.")).toBeInTheDocument();
		});

		it("navigates on quick action select (with haptic)", () => {
			render(<CommandPalette />);
			fireEvent.click(screen.getByText("Nouveau produit"));
			expect(mockTriggerHaptic).toHaveBeenCalledWith("selection");
			expect(mockClose).toHaveBeenCalled();
			expect(mockRouterPush).toHaveBeenCalledWith("/admin/catalogue/produits/nouveau");
		});

		it("navigates on nav item select", () => {
			render(<CommandPalette />);
			fireEvent.click(screen.getByText("Commandes"));
			expect(mockTriggerHaptic).toHaveBeenCalledWith("selection");
			expect(mockClose).toHaveBeenCalled();
			expect(mockRouterPush).toHaveBeenCalledWith("/admin/ventes/commandes");
		});
	});

	describe("mobile — when open", () => {
		beforeEach(() => {
			mockIsOpen.current = true;
			mockIsMobile.current = true;
		});

		it("renders the CommandDrawer (not Dialog)", () => {
			render(<CommandPalette />);
			expect(screen.getByTestId("command-drawer")).toBeInTheDocument();
			expect(screen.queryByTestId("command-dialog")).not.toBeInTheDocument();
		});

		it("does NOT render the ⌘K keyboard hint on mobile", () => {
			render(<CommandPalette />);
			expect(screen.queryByText("K", { selector: "kbd" })).not.toBeInTheDocument();
		});

		it("applies mobile keyboard attributes to input", () => {
			render(<CommandPalette />);
			const input = screen.getByTestId("command-input");
			expect(input).toHaveAttribute("data-inputmode", "search");
			expect(input).toHaveAttribute("data-enterkeyhint", "search");
		});

		it("wraps the list in ScrollFade", () => {
			render(<CommandPalette />);
			expect(screen.getByTestId("scroll-fade")).toBeInTheDocument();
		});

		it("applies safe-area padding to CommandList on mobile", () => {
			render(<CommandPalette />);
			const list = screen.getByTestId("command-list");
			expect(list.getAttribute("data-class")).toContain("safe-area-inset-bottom");
		});

		it("triggers haptic selection on overlay click", () => {
			render(<CommandPalette />);
			fireEvent.click(screen.getByTestId("drawer-overlay"));
			expect(mockTriggerHaptic).toHaveBeenCalledWith("selection");
		});

		it("navigates with haptic selection on item select", () => {
			render(<CommandPalette />);
			fireEvent.click(screen.getByText("Nouveau produit"));
			expect(mockTriggerHaptic).toHaveBeenCalledWith("selection");
			expect(mockClose).toHaveBeenCalled();
			expect(mockRouterPush).toHaveBeenCalledWith("/admin/catalogue/produits/nouveau");
		});

		it("autofocuses input after 350ms delay", () => {
			vi.useFakeTimers();
			try {
				render(<CommandPalette />);
				const input = screen.getByTestId("command-input") as HTMLInputElement;
				const focusSpy = vi.spyOn(input, "focus");

				expect(focusSpy).not.toHaveBeenCalled();
				act(() => {
					vi.advanceTimersByTime(349);
				});
				expect(focusSpy).not.toHaveBeenCalled();

				act(() => {
					vi.advanceTimersByTime(1);
				});
				expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
			} finally {
				vi.useRealTimers();
			}
		});
	});

	describe("focus restoration", () => {
		it("blurs active element on open (desktop)", () => {
			mockIsOpen.current = false;
			mockIsMobile.current = false;
			render(<CommandPalette />);

			// Create & focus a trigger outside the palette
			const trigger = document.createElement("button");
			trigger.textContent = "trigger";
			document.body.appendChild(trigger);
			trigger.focus();
			expect(document.activeElement).toBe(trigger);

			const blurSpy = vi.spyOn(trigger, "blur");

			// Trigger onOpenChange(true) via the mock's hidden trigger button
			fireEvent.click(screen.getByTestId("dialog-trigger-open"));

			expect(blurSpy).toHaveBeenCalled();
			expect(mockOpen).toHaveBeenCalled();
			document.body.removeChild(trigger);
		});

		it("restores focus to previous element on close (desktop dialog)", () => {
			vi.useFakeTimers();
			try {
				mockIsOpen.current = false;
				mockIsMobile.current = false;

				const trigger = document.createElement("button");
				trigger.textContent = "trigger";
				document.body.appendChild(trigger);
				trigger.focus();

				const focusSpy = vi.spyOn(trigger, "focus");

				const { rerender } = render(<CommandPalette />);

				// 1. Open: click the hidden open-trigger to snapshot trigger
				fireEvent.click(screen.getByTestId("dialog-trigger-open"));

				// 2. Rerender with isOpen=true so dialog-trigger-close is visible
				mockIsOpen.current = true;
				rerender(<CommandPalette />);

				// 3. Close via the exposed close trigger
				fireEvent.click(screen.getByTestId("dialog-trigger-close"));

				act(() => {
					vi.advanceTimersByTime(0);
				});

				expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
				document.body.removeChild(trigger);
			} finally {
				vi.useRealTimers();
			}
		});
	});

	describe("close on navigation", () => {
		it("calls close() when pathname changes while open", () => {
			mockIsOpen.current = true;
			mockIsMobile.current = false;
			const { rerender } = render(<CommandPalette />);

			// close() is called on mount (effect) with pathname /admin because
			// isOpen=true. Clear the mock to track only the subsequent change.
			mockClose.mockClear();

			mockPathname.current = "/admin/ventes/commandes";
			rerender(<CommandPalette />);

			expect(mockClose).toHaveBeenCalledTimes(1);
		});

		it("does NOT call close() when pathname changes while closed", () => {
			mockIsOpen.current = false;
			mockIsMobile.current = false;
			const { rerender } = render(<CommandPalette />);

			mockClose.mockClear();
			mockPathname.current = "/admin/autre";
			rerender(<CommandPalette />);

			expect(mockClose).not.toHaveBeenCalled();
		});
	});
});
