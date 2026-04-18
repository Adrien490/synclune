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

vi.mock("@/shared/components/responsive-action-menu", async () => {
	const { buildResponsiveActionMenuMock } =
		await import("@/shared/components/responsive-action-menu/test-mock");
	return buildResponsiveActionMenuMock();
});

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

	it("marks 'Supprimer' as destructive variant", () => {
		render(<ProductTypeRowActions {...defaultProps} isSystem={false} />);
		const deleteItem = screen.getByRole("menuitem", { name: "Supprimer" });
		expect(deleteItem).toHaveAttribute("data-variant", "destructive");
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
