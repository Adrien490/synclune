import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

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
		skuId: "sku_1",
		skuName: "Bague Or 18k - Taille 52",
		isDefault: false,
	},
};

let mockIsPending = false;

vi.mock("@/shared/providers/alert-dialog-store-provider", () => ({
	useAlertDialog: () => mockDialogState,
}));

vi.mock("@/modules/skus/hooks/use-delete-sku", () => ({
	useDeleteProductSku: ({ onSuccess }: { onSuccess?: () => void } = {}) => ({
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
			data: { skuId: string; skuName: string; isDefault?: boolean } | null,
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
					mockDialogState.data as { skuId: string; skuName: string; isDefault?: boolean },
				)}
			</div>
			<button data-testid="action-btn" onClick={() => (action as () => void)()}>
				Supprimer
			</button>
		</div>
	),
}));

import {
	DeleteProductSkuAlertDialog,
	DELETE_PRODUCT_SKU_DIALOG_ID,
} from "../delete-sku-alert-dialog";

// ============================================================================
// TESTS
// ============================================================================

describe("DeleteProductSkuAlertDialog", () => {
	beforeEach(() => {
		cleanup();
		vi.clearAllMocks();
		mockIsPending = false;
		mockDialogState = {
			isOpen: true,
			close: mockClose,
			data: {
				skuId: "sku_1",
				skuName: "Bague Or 18k - Taille 52",
				isDefault: false,
			},
		};
	});

	// ─── Rendering ────────────────────────────────────────────────────────────

	it("renders the DeleteConfirmationDialog", () => {
		render(<DeleteProductSkuAlertDialog />);

		expect(screen.getByTestId("delete-confirmation-dialog")).toBeInTheDocument();
	});

	// ─── Props ────────────────────────────────────────────────────────────────

	it("passes the correct dialogId", () => {
		render(<DeleteProductSkuAlertDialog />);

		expect(screen.getByTestId("delete-confirmation-dialog")).toHaveAttribute(
			"data-dialog-id",
			DELETE_PRODUCT_SKU_DIALOG_ID,
		);
	});

	it("passes isPending=false when hook is not pending", () => {
		render(<DeleteProductSkuAlertDialog />);

		expect(screen.getByTestId("delete-confirmation-dialog")).toHaveAttribute(
			"data-is-pending",
			"false",
		);
	});

	it("passes isPending=true when hook is pending", () => {
		mockIsPending = true;

		render(<DeleteProductSkuAlertDialog />);

		expect(screen.getByTestId("delete-confirmation-dialog")).toHaveAttribute(
			"data-is-pending",
			"true",
		);
	});

	it("passes skuId hidden field via hiddenFields", () => {
		render(<DeleteProductSkuAlertDialog />);

		const field = screen.getByTestId("field-skuId");
		expect(field).toBeInTheDocument();
		expect(field).toHaveAttribute("data-key", "skuId");
	});

	// ─── Description ──────────────────────────────────────────────────────────

	it("shows sku name in description for non-default sku", () => {
		render(<DeleteProductSkuAlertDialog />);

		expect(screen.getByText(/Bague Or 18k - Taille 52/)).toBeInTheDocument();
	});

	it("shows warning for default sku in description", () => {
		mockDialogState = {
			...mockDialogState,
			data: { ...mockDialogState.data, isDefault: true },
		};

		render(<DeleteProductSkuAlertDialog />);

		expect(
			screen.getByText(/Cette variante est la variante principale du produit/),
		).toBeInTheDocument();
	});

	it("shows irreversible warning for non-default sku", () => {
		render(<DeleteProductSkuAlertDialog />);

		expect(screen.getByText(/irréversible/)).toBeInTheDocument();
	});
});
