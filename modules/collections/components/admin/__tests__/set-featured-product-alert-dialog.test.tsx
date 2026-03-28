import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockDialogData, mockDialogIsOpen, mockDialogClose, mockSetFeatured, mockRemoveFeatured } =
	vi.hoisted(() => ({
		mockDialogData: {
			current: null as {
				collectionId: string;
				collectionSlug: string;
				productId: string;
				productTitle: string;
				isFeatured: boolean;
			} | null,
		},
		mockDialogIsOpen: { current: true },
		mockDialogClose: vi.fn(),
		mockSetFeatured: vi.fn(),
		mockRemoveFeatured: vi.fn(),
	}));

vi.mock("@/shared/providers/alert-dialog-store-provider", () => ({
	useAlertDialog: () => ({
		isOpen: mockDialogIsOpen.current,
		close: mockDialogClose,
		data: mockDialogData.current,
	}),
}));

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

vi.mock("@/modules/collections/hooks/use-set-featured-product", () => ({
	useSetFeaturedProduct: ({ onSuccess }: { onSuccess: () => void }) => ({
		setFeatured: mockSetFeatured,
		removeFeatured: mockRemoveFeatured,
		isPending: false,
		onSuccess,
	}),
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/shared/components/ui/alert-dialog", () => ({
	AlertDialog: ({
		children,
		open,
	}: {
		children: React.ReactNode;
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
	}) => (open ? <div data-testid="alert-dialog">{children}</div> : null),
	AlertDialogContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="alert-dialog-content">{children}</div>
	),
	AlertDialogHeader: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="alert-dialog-header">{children}</div>
	),
	AlertDialogTitle: ({
		children,
		className,
	}: {
		children: React.ReactNode;
		className?: string;
	}) => <h2 data-testid="alert-dialog-title">{children}</h2>,
	AlertDialogDescription: ({
		children,
		asChild,
	}: {
		children: React.ReactNode;
		asChild?: boolean;
	}) => <div data-testid="alert-dialog-description">{children}</div>,
	AlertDialogFooter: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="alert-dialog-footer">{children}</div>
	),
	AlertDialogCancel: ({
		children,
		type,
		disabled,
	}: {
		children: React.ReactNode;
		type?: string;
		disabled?: boolean;
	}) => (
		<button type={type as "button"} disabled={disabled}>
			{children}
		</button>
	),
	AlertDialogAction: ({
		children,
		type,
		disabled,
		onClick,
	}: {
		children: React.ReactNode;
		type?: string;
		disabled?: boolean;
		onClick?: () => void;
	}) => (
		<button type={type as "button"} disabled={disabled} onClick={onClick}>
			{children}
		</button>
	),
}));

vi.mock("lucide-react", () => ({
	LoaderCircle: () => <svg data-testid="icon-loader" />,
	Star: ({ className }: { className?: string }) => (
		<svg data-testid="icon-star" className={className} />
	),
}));

import {
	SetFeaturedProductAlertDialog,
	SET_FEATURED_PRODUCT_DIALOG_ID,
} from "../set-featured-product-alert-dialog";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("SetFeaturedProductAlertDialog", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockDialogIsOpen.current = true;
	});

	// ─── Dialog ID constant ───────────────────────────────────────────────────

	it("exports SET_FEATURED_PRODUCT_DIALOG_ID constant", () => {
		expect(SET_FEATURED_PRODUCT_DIALOG_ID).toBe("set-featured-product");
	});

	// ─── Set featured (not featured) ─────────────────────────────────────────

	it("renders 'Definir le produit vedette' title when product is not featured", () => {
		mockDialogData.current = {
			collectionId: "col-1",
			collectionSlug: "bagues-printemps",
			productId: "prod-1",
			productTitle: "Bague Soleil",
			isFeatured: false,
		};
		render(<SetFeaturedProductAlertDialog />);
		expect(screen.getByText("Definir le produit vedette")).toBeInTheDocument();
	});

	it("renders 'Definir comme vedette' button text when product is not featured", () => {
		mockDialogData.current = {
			collectionId: "col-1",
			collectionSlug: "bagues-printemps",
			productId: "prod-1",
			productTitle: "Bague Soleil",
			isFeatured: false,
		};
		render(<SetFeaturedProductAlertDialog />);
		expect(screen.getByText("Definir comme vedette")).toBeInTheDocument();
	});

	// ─── Remove featured (is featured) ───────────────────────────────────────

	it("renders 'Retirer le produit vedette' title when product is featured", () => {
		mockDialogData.current = {
			collectionId: "col-1",
			collectionSlug: "bagues-printemps",
			productId: "prod-1",
			productTitle: "Bague Soleil",
			isFeatured: true,
		};
		render(<SetFeaturedProductAlertDialog />);
		expect(screen.getByText("Retirer le produit vedette")).toBeInTheDocument();
	});

	it("renders 'Retirer' button text when product is featured", () => {
		mockDialogData.current = {
			collectionId: "col-1",
			collectionSlug: "bagues-printemps",
			productId: "prod-1",
			productTitle: "Bague Soleil",
			isFeatured: true,
		};
		render(<SetFeaturedProductAlertDialog />);
		expect(screen.getByText("Retirer")).toBeInTheDocument();
	});

	// ─── Product name in description ──────────────────────────────────────────

	it("shows product name in description when setting featured", () => {
		mockDialogData.current = {
			collectionId: "col-1",
			collectionSlug: "bagues-printemps",
			productId: "prod-1",
			productTitle: "Bague Soleil",
			isFeatured: false,
		};
		render(<SetFeaturedProductAlertDialog />);
		expect(screen.getByText(/Bague Soleil/)).toBeInTheDocument();
	});

	it("shows product name in description when removing featured", () => {
		mockDialogData.current = {
			collectionId: "col-1",
			collectionSlug: "bagues-printemps",
			productId: "prod-1",
			productTitle: "Collier Lune",
			isFeatured: true,
		};
		render(<SetFeaturedProductAlertDialog />);
		expect(screen.getByText(/Collier Lune/)).toBeInTheDocument();
	});

	it("does not render when dialog is closed", () => {
		mockDialogIsOpen.current = false;
		mockDialogData.current = {
			collectionId: "col-1",
			collectionSlug: "bagues-printemps",
			productId: "prod-1",
			productTitle: "Bague Soleil",
			isFeatured: false,
		};
		render(<SetFeaturedProductAlertDialog />);
		expect(screen.queryByTestId("alert-dialog")).not.toBeInTheDocument();
	});
});
