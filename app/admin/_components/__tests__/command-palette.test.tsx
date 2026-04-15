import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as LucideReact from "lucide-react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockToggle, mockClose, mockOpen, mockIsOpen, mockRouterPush } = vi.hoisted(() => ({
	mockToggle: vi.fn(),
	mockClose: vi.fn(),
	mockOpen: vi.fn(),
	mockIsOpen: { current: false },
	mockRouterPush: vi.fn(),
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
}));

vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: () => ({
		isOpen: mockIsOpen.current,
		open: mockOpen,
		close: mockClose,
		toggle: mockToggle,
	}),
}));

vi.mock("@/shared/components/ui/command", () => ({
	CommandDialog: ({
		children,
		open,
		title,
		description,
	}: {
		children: React.ReactNode;
		open: boolean;
		onOpenChange: (v: boolean) => void;
		title: string;
		description: string;
	}) =>
		open ? (
			<div data-testid="command-dialog" aria-label={title} aria-description={description}>
				{children}
			</div>
		) : null,
	CommandEmpty: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="command-empty">{children}</div>
	),
	CommandGroup: ({ children, heading }: { children: React.ReactNode; heading: string }) => (
		<div data-testid="command-group" data-heading={heading}>
			<p>{heading}</p>
			{children}
		</div>
	),
	CommandInput: ({ placeholder }: { placeholder: string }) => (
		<input data-testid="command-input" placeholder={placeholder} />
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
	CommandList: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="command-list">{children}</div>
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
		it("does not render dialog content", () => {
			mockIsOpen.current = false;
			render(<CommandPalette />);
			expect(screen.queryByTestId("command-dialog")).not.toBeInTheDocument();
		});
	});

	describe("when open", () => {
		beforeEach(() => {
			mockIsOpen.current = true;
		});

		it("renders the dialog", () => {
			render(<CommandPalette />);
			expect(screen.getByTestId("command-dialog")).toBeInTheDocument();
		});

		it("renders search input with placeholder", () => {
			render(<CommandPalette />);
			expect(screen.getByTestId("command-input")).toHaveAttribute(
				"placeholder",
				"Rechercher une page ou une action...",
			);
		});

		it("renders quick actions group", () => {
			render(<CommandPalette />);
			expect(screen.getByText("Actions rapides")).toBeInTheDocument();
		});

		it("renders 5 quick actions", () => {
			render(<CommandPalette />);
			expect(screen.getByText("Nouveau produit")).toBeInTheDocument();
			expect(screen.getByText("Nouvelle collection")).toBeInTheDocument();
			expect(screen.getByText("Nouveau code promo")).toBeInTheDocument();
			expect(screen.getByText("Nouvelle annonce")).toBeInTheDocument();
			expect(screen.getByText("Nouvelle question FAQ")).toBeInTheDocument();
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

		it("navigates on quick action select", () => {
			render(<CommandPalette />);
			fireEvent.click(screen.getByText("Nouveau produit"));
			expect(mockClose).toHaveBeenCalled();
			expect(mockRouterPush).toHaveBeenCalledWith("/admin/catalogue/produits/nouveau");
		});

		it("navigates on nav item select", () => {
			render(<CommandPalette />);
			fireEvent.click(screen.getByText("Commandes"));
			expect(mockClose).toHaveBeenCalled();
			expect(mockRouterPush).toHaveBeenCalledWith("/admin/ventes/commandes");
		});
	});
});
