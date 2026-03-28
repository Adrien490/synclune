import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockClose, mockAction } = vi.hoisted(() => ({
	mockClose: vi.fn(),
	mockAction: vi.fn(),
}));

let mockDialogState = {
	isOpen: true,
	close: mockClose,
	data: {
		productTypeId: "pt-1",
		label: "Colliers",
		productsCount: 0,
	} as {
		productTypeId: string;
		label: string;
		productsCount?: number;
		[key: string]: unknown;
	} | null,
};

let mockIsPending = false;

vi.mock("@/shared/providers/alert-dialog-store-provider", () => ({
	useAlertDialog: () => mockDialogState,
}));

vi.mock("@/modules/product-types/hooks/use-delete-product-type", () => ({
	useDeleteProductType: ({ onSuccess }: { onSuccess?: () => void } = {}) => ({
		action: mockAction,
		isPending: mockIsPending,
		onSuccess,
	}),
}));

vi.mock("@/shared/components/dialogs", () => ({
	DeleteConfirmationDialog: ({
		dialogId,
		action,
		isPending,
		hiddenFields,
		description,
	}: {
		dialogId: string;
		action: unknown;
		isPending: boolean;
		hiddenFields: { name: string; dataKey: string }[];
		description: (
			data: { productTypeId: string; label: string; productsCount?: number } | null,
		) => React.ReactNode;
	}) => (
		<div
			data-testid="delete-confirmation-dialog"
			data-dialog-id={dialogId}
			data-is-pending={isPending}
		>
			<div data-testid="hidden-fields">
				{hiddenFields.map((f) => (
					<span key={f.name} data-testid={`field-${f.name}`} data-key={f.dataKey} />
				))}
			</div>
			<div data-testid="description">
				{description(
					mockDialogState.data as {
						productTypeId: string;
						label: string;
						productsCount?: number;
					} | null,
				)}
			</div>
			<button data-testid="action-btn" onClick={() => (action as () => void)()}>
				Supprimer
			</button>
		</div>
	),
}));

import {
	DeleteProductTypeAlertDialog,
	DELETE_PRODUCT_TYPE_DIALOG_ID,
} from "../delete-product-type-alert-dialog";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("DeleteProductTypeAlertDialog", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockIsPending = false;
		mockDialogState = {
			isOpen: true,
			close: mockClose,
			data: {
				productTypeId: "pt-1",
				label: "Colliers",
				productsCount: 0,
			},
		};
	});

	// ─── Dialog ID export ──────────────────────────────────────────────────────

	it("exports DELETE_PRODUCT_TYPE_DIALOG_ID", () => {
		expect(DELETE_PRODUCT_TYPE_DIALOG_ID).toBe("delete-product-type");
	});

	// ─── Rendering ────────────────────────────────────────────────────────────

	it("renders the DeleteConfirmationDialog", () => {
		render(<DeleteProductTypeAlertDialog />);
		expect(screen.getByTestId("delete-confirmation-dialog")).toBeInTheDocument();
	});

	it("passes the correct dialogId", () => {
		render(<DeleteProductTypeAlertDialog />);
		expect(screen.getByTestId("delete-confirmation-dialog")).toHaveAttribute(
			"data-dialog-id",
			DELETE_PRODUCT_TYPE_DIALOG_ID,
		);
	});

	it("passes isPending=false when hook is not pending", () => {
		render(<DeleteProductTypeAlertDialog />);
		expect(screen.getByTestId("delete-confirmation-dialog")).toHaveAttribute(
			"data-is-pending",
			"false",
		);
	});

	it("passes isPending=true when hook is pending", () => {
		mockIsPending = true;
		render(<DeleteProductTypeAlertDialog />);
		expect(screen.getByTestId("delete-confirmation-dialog")).toHaveAttribute(
			"data-is-pending",
			"true",
		);
	});

	it("passes productTypeId hidden field via hiddenFields", () => {
		render(<DeleteProductTypeAlertDialog />);
		const field = screen.getByTestId("field-productTypeId");
		expect(field).toBeInTheDocument();
		expect(field).toHaveAttribute("data-key", "productTypeId");
	});

	// ─── Description ──────────────────────────────────────────────────────────

	it("shows label in description", () => {
		render(<DeleteProductTypeAlertDialog />);
		expect(screen.getByText(/Colliers/)).toBeInTheDocument();
	});

	it("shows irreversible warning text", () => {
		render(<DeleteProductTypeAlertDialog />);
		expect(screen.getByText(/irréversible/)).toBeInTheDocument();
	});

	it("shows product count warning when productsCount is greater than 0", () => {
		mockDialogState = {
			...mockDialogState,
			data: {
				productTypeId: "pt-1",
				label: "Colliers",
				productsCount: 5,
			},
		};
		render(<DeleteProductTypeAlertDialog />);
		expect(screen.getByText(/5 produit/)).toBeInTheDocument();
	});

	it("does not show product count warning when productsCount is 0", () => {
		render(<DeleteProductTypeAlertDialog />);
		expect(screen.queryByText(/produit.*actif/)).not.toBeInTheDocument();
	});
});
