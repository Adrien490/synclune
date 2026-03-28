import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const mocks = vi.hoisted(() => ({
	isOpen: false,
	data: null as { reviewId: string; productTitle: string } | null,
	close: vi.fn(),
}));

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({}));

vi.mock("@/shared/providers/alert-dialog-store-provider", () => ({
	useAlertDialog: () => ({
		isOpen: mocks.isOpen,
		data: mocks.data,
		close: mocks.close,
	}),
}));

vi.mock("@/modules/reviews/hooks/use-delete-review", () => ({
	useDeleteReview: () => ({
		action: vi.fn(),
		isPending: false,
	}),
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
	AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogTitle: ({ children }: { children: React.ReactNode }) => (
		<h2 data-testid="alert-dialog-title">{children}</h2>
	),
	AlertDialogDescription: ({ children }: { children: React.ReactNode }) => (
		<p data-testid="alert-dialog-description">{children}</p>
	),
	AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogCancel: ({
		children,
		disabled,
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		type?: string;
	}) => (
		<button data-testid="cancel-button" disabled={disabled}>
			{children}
		</button>
	),
	AlertDialogAction: ({
		children,
		disabled,
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		type?: string;
		"aria-busy"?: boolean;
		className?: string;
	}) => (
		<button data-testid="action-button" disabled={disabled}>
			{children}
		</button>
	),
}));

vi.mock("lucide-react", () => ({
	LoaderCircle: () => <svg data-testid="icon-loader" />,
}));

import { DeleteReviewAlertDialog } from "../delete-review-alert-dialog";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("DeleteReviewAlertDialog", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.isOpen = false;
		mocks.data = null;
	});

	it("renders nothing when dialog is closed", () => {
		render(<DeleteReviewAlertDialog />);
		expect(screen.queryByTestId("alert-dialog")).toBeNull();
	});

	it("renders dialog content when open", () => {
		mocks.isOpen = true;
		mocks.data = { reviewId: "rev-1", productTitle: "Bague argent" };
		render(<DeleteReviewAlertDialog />);
		expect(screen.getByTestId("alert-dialog")).toBeInTheDocument();
	});

	it("shows 'Supprimer cet avis ?' title when open", () => {
		mocks.isOpen = true;
		mocks.data = { reviewId: "rev-1", productTitle: "Bague argent" };
		render(<DeleteReviewAlertDialog />);
		expect(screen.getByText("Supprimer cet avis ?")).toBeInTheDocument();
	});

	it("shows product title in description when open", () => {
		mocks.isOpen = true;
		mocks.data = { reviewId: "rev-1", productTitle: "Bague argent" };
		render(<DeleteReviewAlertDialog />);
		expect(screen.getByText(/Bague argent/)).toBeInTheDocument();
	});

	it("renders 'Annuler' and 'Supprimer' buttons when open", () => {
		mocks.isOpen = true;
		mocks.data = { reviewId: "rev-1", productTitle: "Bague argent" };
		render(<DeleteReviewAlertDialog />);
		expect(screen.getByTestId("cancel-button")).toBeInTheDocument();
		expect(screen.getByTestId("action-button")).toBeInTheDocument();
	});
});
