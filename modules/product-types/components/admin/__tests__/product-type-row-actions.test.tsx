import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockOpenDialog, mockOpenAlertDialog, mockDuplicateProductType } = vi.hoisted(() => ({
	mockOpenDialog: vi.fn(),
	mockOpenAlertDialog: vi.fn(),
	mockDuplicateProductType: vi.fn(),
}));

vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: () => ({ open: mockOpenDialog }),
}));

vi.mock("@/shared/providers/alert-dialog-store-provider", () => ({
	useAlertDialog: () => ({ open: mockOpenAlertDialog }),
}));

vi.mock("@/modules/product-types/hooks/use-duplicate-product-type", () => ({
	useDuplicateProductType: () => ({
		duplicateProductType: mockDuplicateProductType,
		isPending: false,
	}),
}));

vi.mock("@/modules/product-types/components/product-type-form-dialog", () => ({
	PRODUCT_TYPE_DIALOG_ID: "product-type-form",
}));

vi.mock("@/modules/product-types/components/admin/delete-product-type-alert-dialog", () => ({
	DELETE_PRODUCT_TYPE_DIALOG_ID: "delete-product-type",
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
		...rest
	}: {
		children: React.ReactNode;
		"aria-label"?: string;
		[key: string]: unknown;
	}) => (
		<button aria-label={ariaLabel} {...rest}>
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
	DropdownMenuLabel: ({
		children,
		className,
	}: {
		children: React.ReactNode;
		className?: string;
	}) => (
		<div data-testid="dropdown-label" className={className}>
			{children}
		</div>
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
	}) =>
		asChild ? (
			<div role="menuitem" className={className}>
				{children}
			</div>
		) : (
			<button role="menuitem" onClick={onClick} className={className} aria-disabled={disabled}>
				{children}
			</button>
		),
}));

vi.mock("lucide-react", () => ({
	Copy: () => <svg data-testid="icon-copy" />,
	EllipsisVertical: () => <svg data-testid="icon-ellipsis" />,
	ExternalLink: () => <svg data-testid="icon-external-link" />,
	Pencil: () => <svg data-testid="icon-pencil" />,
	ShieldCheck: () => <svg data-testid="icon-shield-check" />,
	Trash2: () => <svg data-testid="icon-trash" />,
}));

import { ProductTypeRowActions } from "../product-type-row-actions";

const defaultProps = {
	productTypeId: "pt-1",
	isSystem: false,
	label: "Colliers",
	description: "Types de colliers",
	slug: "colliers",
	productsCount: 0,
};

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("ProductTypeRowActions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ─── Rendering ────────────────────────────────────────────────────────────

	it("renders trigger button with 'Actions' aria-label", () => {
		render(<ProductTypeRowActions {...defaultProps} />);
		expect(screen.getByRole("button", { name: "Actions" })).toBeInTheDocument();
	});

	it("renders 'Voir les produits' link item", () => {
		render(<ProductTypeRowActions {...defaultProps} />);
		expect(screen.getByText("Voir les produits")).toBeInTheDocument();
	});

	it("links to products filtered by productTypeId", () => {
		render(<ProductTypeRowActions {...defaultProps} productTypeId="pt-42" />);
		const link = screen.getByText("Voir les produits").closest("a");
		expect(link).toHaveAttribute("href", "/admin/catalogue/produits?productTypeId=pt-42");
	});

	// ─── Non-system type ──────────────────────────────────────────────────────

	it("shows 'Éditer' when isSystem is false", () => {
		render(<ProductTypeRowActions {...defaultProps} isSystem={false} />);
		expect(screen.getByText("Éditer")).toBeInTheDocument();
	});

	it("shows 'Supprimer' when isSystem is false", () => {
		render(<ProductTypeRowActions {...defaultProps} isSystem={false} />);
		expect(screen.getByText("Supprimer")).toBeInTheDocument();
	});

	it("applies destructive styling to 'Supprimer' item", () => {
		render(<ProductTypeRowActions {...defaultProps} isSystem={false} />);
		const deleteItem = screen.getByText("Supprimer").closest("[role='menuitem']");
		expect(deleteItem).toHaveClass("text-destructive");
	});

	it("renders separator before 'Supprimer' when not a system type", () => {
		render(<ProductTypeRowActions {...defaultProps} isSystem={false} />);
		expect(screen.getByTestId("dropdown-separator")).toBeInTheDocument();
	});

	// ─── System type ──────────────────────────────────────────────────────────

	it("shows 'Type système protégé' label when isSystem is true", () => {
		render(<ProductTypeRowActions {...defaultProps} isSystem={true} />);
		expect(screen.getByText(/Type système protégé/)).toBeInTheDocument();
	});

	it("shows 'Voir (lecture seule)' instead of 'Éditer' when isSystem is true", () => {
		render(<ProductTypeRowActions {...defaultProps} isSystem={true} />);
		expect(screen.getByText("Voir (lecture seule)")).toBeInTheDocument();
		expect(screen.queryByText("Éditer")).not.toBeInTheDocument();
	});

	it("does not show 'Supprimer' when isSystem is true", () => {
		render(<ProductTypeRowActions {...defaultProps} isSystem={true} />);
		expect(screen.queryByText("Supprimer")).not.toBeInTheDocument();
	});
});
