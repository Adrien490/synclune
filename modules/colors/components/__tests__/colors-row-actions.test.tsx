import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockOpenDialog, mockOpenAlert, mockDuplicate } = vi.hoisted(() => ({
	mockOpenDialog: vi.fn(),
	mockOpenAlert: vi.fn(),
	mockDuplicate: vi.fn(),
}));

vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: () => ({ open: mockOpenDialog }),
}));

vi.mock("@/shared/providers/alert-dialog-store-provider", () => ({
	useAlertDialog: () => ({ open: mockOpenAlert }),
}));

vi.mock("@/modules/colors/hooks/use-duplicate-color", () => ({
	useDuplicateColor: () => ({ duplicate: mockDuplicate, isPending: false }),
}));

vi.mock("@/modules/colors/components/color-form-dialog", () => ({
	COLOR_DIALOG_ID: "color-form",
}));

vi.mock("@/modules/colors/components/admin/delete-color-alert-dialog", () => ({
	DELETE_COLOR_DIALOG_ID: "delete-color",
}));

vi.mock("next/link", () => ({
	default: ({ children, href }: { children: React.ReactNode; href: string }) => (
		<a href={href}>{children}</a>
	),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		"aria-label": ariaLabel,
		className,
		...rest
	}: {
		children: React.ReactNode;
		"aria-label"?: string;
		className?: string;
		[key: string]: unknown;
	}) => (
		<button aria-label={ariaLabel} className={className} {...rest}>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/ui/dropdown-menu", () => ({
	DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	DropdownMenuTrigger: ({ children }: { children: React.ReactNode; asChild?: boolean }) => (
		<div data-testid="dropdown-trigger">{children}</div>
	),
	DropdownMenuContent: ({ children }: { children: React.ReactNode; align?: string }) => (
		<div data-testid="dropdown-content">{children}</div>
	),
	DropdownMenuSeparator: () => <hr data-testid="dropdown-separator" />,
	DropdownMenuItem: ({
		children,
		onClick,
		className,
		disabled,
		asChild,
	}: {
		children: React.ReactNode;
		onClick?: () => void;
		className?: string;
		disabled?: boolean;
		asChild?: boolean;
	}) => (
		<button role="menuitem" onClick={onClick} className={className} aria-disabled={disabled}>
			{children}
		</button>
	),
}));

vi.mock("lucide-react", () => ({
	Copy: () => <svg data-testid="icon-copy" />,
	SquarePen: () => <svg data-testid="icon-square-pen" />,
	ExternalLink: () => <svg data-testid="icon-external-link" />,
	EllipsisVertical: () => <svg data-testid="icon-ellipsis" />,
	Trash2: () => <svg data-testid="icon-trash" />,
}));

import { ColorsRowActions } from "../colors-row-actions";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("ColorsRowActions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ─── Rendering ────────────────────────────────────────────────────────────

	it("renders trigger button with contextual aria-label including the color name", () => {
		render(
			<ColorsRowActions colorId="c-1" colorName="Rouge" colorHex="#FF0000" colorSlug="rouge" />,
		);
		expect(screen.getByRole("button", { name: "Actions pour Rouge" })).toBeInTheDocument();
	});

	it("renders trigger button with aria-label reflecting a different color name", () => {
		render(
			<ColorsRowActions
				colorId="c-2"
				colorName="Bleu Marine"
				colorHex="#001F5B"
				colorSlug="bleu-marine"
			/>,
		);
		expect(screen.getByRole("button", { name: "Actions pour Bleu Marine" })).toBeInTheDocument();
	});

	it("shows 'Éditer' menu item", () => {
		render(
			<ColorsRowActions colorId="c-1" colorName="Rouge" colorHex="#FF0000" colorSlug="rouge" />,
		);
		expect(screen.getByText("Éditer")).toBeInTheDocument();
	});

	it("shows 'Dupliquer' menu item", () => {
		render(
			<ColorsRowActions colorId="c-1" colorName="Rouge" colorHex="#FF0000" colorSlug="rouge" />,
		);
		expect(screen.getByText("Dupliquer")).toBeInTheDocument();
	});

	it("shows 'Voir les variantes' menu item", () => {
		render(
			<ColorsRowActions colorId="c-1" colorName="Rouge" colorHex="#FF0000" colorSlug="rouge" />,
		);
		expect(screen.getByText("Voir les variantes")).toBeInTheDocument();
	});

	it("shows 'Supprimer' menu item", () => {
		render(
			<ColorsRowActions colorId="c-1" colorName="Rouge" colorHex="#FF0000" colorSlug="rouge" />,
		);
		expect(screen.getByText("Supprimer")).toBeInTheDocument();
	});

	// ─── Separator ────────────────────────────────────────────────────────────

	it("renders separator before 'Supprimer'", () => {
		render(
			<ColorsRowActions colorId="c-1" colorName="Rouge" colorHex="#FF0000" colorSlug="rouge" />,
		);
		expect(screen.getByTestId("dropdown-separator")).toBeInTheDocument();
	});

	// ─── Destructive styling ──────────────────────────────────────────────────

	it("applies destructive styling to 'Supprimer' item", () => {
		render(
			<ColorsRowActions colorId="c-1" colorName="Rouge" colorHex="#FF0000" colorSlug="rouge" />,
		);
		const deleteItem = screen.getByText("Supprimer").closest("[role='menuitem']");
		expect(deleteItem).toHaveClass("text-destructive");
	});

	// ─── 'Voir les variantes' link ────────────────────────────────────────────

	it("'Voir les variantes' links to inventaire filtered by colorId", () => {
		render(
			<ColorsRowActions colorId="c-99" colorName="Vert" colorHex="#00FF00" colorSlug="vert" />,
		);
		const link = screen.getByRole("link", { name: /Voir les variantes/ });
		expect(link).toHaveAttribute("href", "/admin/catalogue/inventaire?colorId=c-99");
	});
});
