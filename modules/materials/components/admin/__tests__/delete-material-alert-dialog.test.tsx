import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockDialog, mockAction, mockIsPending } = vi.hoisted(() => ({
	mockDialog: {
		isOpen: true,
		data: {
			materialId: "mat-1",
			materialName: "Argent 925",
		} as {
			materialId: string;
			materialName: string;
			[key: string]: unknown;
		} | null,
		open: vi.fn(),
		close: vi.fn(),
	},
	mockAction: vi.fn(),
	mockIsPending: { value: false },
}));

vi.mock("@/shared/providers/alert-dialog-store-provider", () => ({
	useAlertDialog: () => mockDialog,
}));

vi.mock("@/modules/materials/hooks/use-delete-material", () => ({
	useDeleteMaterial: ({ onSuccess }: { onSuccess?: () => void }) => ({
		action: mockAction,
		isPending: mockIsPending.value,
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
		description: (data: Record<string, unknown> | null | undefined) => React.ReactNode;
	}) => (
		<div
			data-testid="delete-confirmation-dialog"
			data-dialog-id={dialogId}
			data-pending={String(isPending)}
		>
			<div data-testid="hidden-fields">{JSON.stringify(hiddenFields)}</div>
			<div data-testid="description">{description(mockDialog.data ?? undefined)}</div>
			<input type="hidden" name="_action" value={String(action)} />
		</div>
	),
}));

import {
	DELETE_MATERIAL_DIALOG_ID,
	DeleteMaterialAlertDialog,
} from "../delete-material-alert-dialog";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("DeleteMaterialAlertDialog", () => {
	beforeEach(() => {
		mockIsPending.value = false;
		mockDialog.isOpen = true;
		mockDialog.data = {
			materialId: "mat-1",
			materialName: "Argent 925",
		};
	});

	// ─── Dialog ID export ─────────────────────────────────────────────────────

	it("exports DELETE_MATERIAL_DIALOG_ID as 'delete-material'", () => {
		expect(DELETE_MATERIAL_DIALOG_ID).toBe("delete-material");
	});

	// ─── Rendering ────────────────────────────────────────────────────────────

	it("renders the DeleteConfirmationDialog", () => {
		render(<DeleteMaterialAlertDialog />);
		expect(screen.getByTestId("delete-confirmation-dialog")).toBeInTheDocument();
	});

	it("passes the correct dialogId to DeleteConfirmationDialog", () => {
		render(<DeleteMaterialAlertDialog />);
		expect(screen.getByTestId("delete-confirmation-dialog")).toHaveAttribute(
			"data-dialog-id",
			DELETE_MATERIAL_DIALOG_ID,
		);
	});

	// ─── Hidden fields ────────────────────────────────────────────────────────

	it("passes hiddenFields with id mapped to materialId", () => {
		render(<DeleteMaterialAlertDialog />);
		const hiddenFields = screen.getByTestId("hidden-fields");
		const parsed = JSON.parse(hiddenFields.textContent ?? "[]");
		expect(parsed).toContainEqual({ name: "id", dataKey: "materialId" });
	});

	// ─── Description ─────────────────────────────────────────────────────────

	it("shows material name in the description", () => {
		render(<DeleteMaterialAlertDialog />);
		expect(screen.getByText(/Argent 925/)).toBeInTheDocument();
	});

	it("shows 'supprimer le matériau' in description text", () => {
		render(<DeleteMaterialAlertDialog />);
		expect(screen.getByText(/supprimer le matériau/)).toBeInTheDocument();
	});

	it("shows irreversible warning in description", () => {
		render(<DeleteMaterialAlertDialog />);
		expect(screen.getByText("Cette action est irréversible.")).toBeInTheDocument();
	});

	// ─── Pending state ────────────────────────────────────────────────────────

	it("passes isPending true to DeleteConfirmationDialog when pending", () => {
		mockIsPending.value = true;
		render(<DeleteMaterialAlertDialog />);
		expect(screen.getByTestId("delete-confirmation-dialog")).toHaveAttribute(
			"data-pending",
			"true",
		);
	});

	it("passes isPending false to DeleteConfirmationDialog when not pending", () => {
		mockIsPending.value = false;
		render(<DeleteMaterialAlertDialog />);
		expect(screen.getByTestId("delete-confirmation-dialog")).toHaveAttribute(
			"data-pending",
			"false",
		);
	});
});
