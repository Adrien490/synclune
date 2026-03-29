import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockRemoveDialog, mockAction, mockIsPending } = vi.hoisted(() => ({
	mockRemoveDialog: {
		isOpen: false,
		open: vi.fn(),
		close: vi.fn(),
		data: undefined as { productId: string; itemName: string } | undefined,
	},
	mockAction: vi.fn(),
	mockIsPending: { value: false },
}));

vi.mock("@/modules/wishlist/hooks/use-remove-from-wishlist", () => ({
	useRemoveFromWishlist: vi.fn(() => ({
		action: mockAction,
		isPending: mockIsPending.value,
	})),
}));

vi.mock("@/shared/providers/alert-dialog-store-provider", () => ({
	useAlertDialog: vi.fn(() => mockRemoveDialog),
}));

vi.mock("@/modules/wishlist/contexts/wishlist-list-optimistic-context", () => ({
	useWishlistListOptimistic: vi.fn(() => null),
}));

vi.mock("@/modules/wishlist/constants/dialog-ids", () => ({
	WISHLIST_DIALOG_IDS: { REMOVE_ITEM: "wishlist-remove-item" },
}));

vi.mock("sonner", () => ({
	toast: {
		success: vi.fn(),
	},
}));

vi.mock("@/shared/components/ui/alert-dialog", () => ({
	AlertDialog: ({
		children,
		open,
	}: {
		children: React.ReactNode;
		open: boolean;
		onOpenChange?: (v: boolean) => void;
	}) => (open ? <div data-testid="alert-dialog">{children}</div> : null),
	AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
	AlertDialogDescription: ({
		children,
		asChild,
	}: {
		children: React.ReactNode;
		asChild?: boolean;
	}) => (asChild ? <div>{children}</div> : <p>{children}</p>),
	AlertDialogCancel: ({
		children,
		disabled,
		type: _type,
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		type?: string;
	}) => <button disabled={disabled}>{children}</button>,
	AlertDialogAction: ({
		children,
		disabled,
		type: _type,
		"aria-busy": ariaBusy,
		className,
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		type?: string;
		"aria-busy"?: boolean;
		className?: string;
	}) => (
		<button type="submit" disabled={disabled} aria-busy={ariaBusy} className={className}>
			{children}
		</button>
	),
}));

vi.mock("lucide-react", () => ({
	LoaderCircle: () => <svg data-testid="icon-loader" className="animate-spin" />,
}));

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

import { RemoveWishlistItemAlertDialog } from "../remove-wishlist-item-alert-dialog";

// ============================================================================
// TESTS
// ============================================================================

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	mockRemoveDialog.isOpen = false;
	mockRemoveDialog.data = undefined;
	mockIsPending.value = false;
});

beforeEach(() => {
	mockRemoveDialog.isOpen = false;
	mockRemoveDialog.data = undefined;
	mockIsPending.value = false;
});

describe("RemoveWishlistItemAlertDialog", () => {
	// ─── Closed state ─────────────────────────────────────────────────────────

	it("renders nothing when dialog is closed", () => {
		mockRemoveDialog.isOpen = false;
		render(<RemoveWishlistItemAlertDialog />);
		expect(screen.queryByTestId("alert-dialog")).toBeNull();
	});

	// ─── Open state ───────────────────────────────────────────────────────────

	it("renders the dialog when isOpen is true", () => {
		mockRemoveDialog.isOpen = true;
		render(<RemoveWishlistItemAlertDialog />);
		expect(screen.getByTestId("alert-dialog")).toBeInTheDocument();
	});

	it("renders the dialog title", () => {
		mockRemoveDialog.isOpen = true;
		render(<RemoveWishlistItemAlertDialog />);
		expect(
			screen.getByRole("heading", { name: /Retirer ce produit de votre wishlist/i }),
		).toBeInTheDocument();
	});

	it("shows item name in description when data.itemName is set", () => {
		mockRemoveDialog.isOpen = true;
		mockRemoveDialog.data = { productId: "prod-1", itemName: "Bague Lune" };
		render(<RemoveWishlistItemAlertDialog />);
		expect(document.body.textContent).toContain("Bague Lune");
	});

	it("shows generic message when no itemName is set", () => {
		mockRemoveDialog.isOpen = true;
		mockRemoveDialog.data = undefined;
		render(<RemoveWishlistItemAlertDialog />);
		expect(document.body.textContent).toContain("ce produit");
	});

	it("renders Cancel and Delete buttons", () => {
		mockRemoveDialog.isOpen = true;
		render(<RemoveWishlistItemAlertDialog />);
		expect(screen.getByText("Annuler")).toBeInTheDocument();
		expect(screen.getByText("Supprimer")).toBeInTheDocument();
	});

	it("includes hidden productId input when data is set", () => {
		mockRemoveDialog.isOpen = true;
		mockRemoveDialog.data = { productId: "prod-42", itemName: "Bague" };
		render(<RemoveWishlistItemAlertDialog />);
		const input = document.querySelector('input[name="productId"]') as HTMLInputElement;
		expect(input.value).toBe("prod-42");
	});

	// ─── Pending state ────────────────────────────────────────────────────────

	it("shows 'Suppression...' when isPending is true", () => {
		mockRemoveDialog.isOpen = true;
		mockIsPending.value = true;
		render(<RemoveWishlistItemAlertDialog />);
		expect(document.body.textContent).toContain("Suppression...");
	});

	it("shows loader icon when isPending is true", () => {
		mockRemoveDialog.isOpen = true;
		mockIsPending.value = true;
		render(<RemoveWishlistItemAlertDialog />);
		expect(screen.getByTestId("icon-loader")).toBeInTheDocument();
	});

	it("disables cancel button when isPending is true", () => {
		mockRemoveDialog.isOpen = true;
		mockIsPending.value = true;
		render(<RemoveWishlistItemAlertDialog />);
		const cancelBtn = screen.getByText("Annuler");
		expect(cancelBtn).toBeDisabled();
	});
});
