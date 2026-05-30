import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockDialog, mockAction, mockIsPending } = vi.hoisted(() => ({
	mockDialog: {
		isOpen: true,
		data: {
			colorId: "c-1",
			colorName: "Rouge",
		} as {
			colorId: string;
			colorName: string;
			[key: string]: unknown;
		} | null,
		open: vi.fn(),
		close: vi.fn(),
	},
	mockAction: vi.fn(),
	mockIsPending: { value: false },
}));

vi.mock("@/shared/hooks/use-back-to-list-on-delete", () => ({
	useBackToListOnDelete: () => vi.fn(),
}));

vi.mock("@/shared/providers/alert-dialog-store-provider", () => ({
	useAlertDialog: () => mockDialog,
}));

vi.mock("@/modules/colors/hooks/use-delete-color", () => ({
	useDeleteColor: ({ onSuccess }: { onSuccess?: () => void }) => ({
		action: mockAction,
		isPending: mockIsPending.value,
		onSuccess,
	}),
}));

vi.mock("@/shared/components/dialogs", () => ({
	DeleteConfirmationDialog: ({
		description,
	}: {
		dialogId: string;
		action: unknown;
		isPending: boolean;
		hiddenFields: unknown[];
		description: (
			data: { colorId: string; colorName: string; [key: string]: unknown } | null,
		) => React.ReactNode;
	}) => (
		<div data-testid="delete-confirmation-dialog">
			<div data-testid="dialog-description">{description(mockDialog.data)}</div>
		</div>
	),
}));

import { DELETE_COLOR_DIALOG_ID, DeleteColorAlertDialog } from "../delete-color-alert-dialog";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("DeleteColorAlertDialog", () => {
	beforeEach(() => {
		mockIsPending.value = false;
		mockDialog.isOpen = true;
		mockDialog.data = {
			colorId: "c-1",
			colorName: "Rouge",
		};
	});

	// ─── Constant ─────────────────────────────────────────────────────────────

	it("exports correct DELETE_COLOR_DIALOG_ID constant", () => {
		expect(DELETE_COLOR_DIALOG_ID).toBe("delete-color");
	});

	// ─── Rendering ────────────────────────────────────────────────────────────

	it("renders the DeleteConfirmationDialog", () => {
		render(<DeleteColorAlertDialog />);
		expect(screen.getByTestId("delete-confirmation-dialog")).toBeInTheDocument();
	});

	// ─── Content ──────────────────────────────────────────────────────────────

	it("shows the color name in the description", () => {
		render(<DeleteColorAlertDialog />);
		expect(screen.getByText(/Rouge/)).toBeInTheDocument();
	});

	it("shows irreversible warning in description", () => {
		render(<DeleteColorAlertDialog />);
		expect(screen.getByText("Cette action est irréversible.")).toBeInTheDocument();
	});

	it("shows confirmation message in description", () => {
		render(<DeleteColorAlertDialog />);
		expect(screen.getByText(/Êtes-vous sûr de vouloir supprimer la couleur/)).toBeInTheDocument();
	});

	it("shows different color name when dialog data changes", () => {
		mockDialog.data = {
			colorId: "c-2",
			colorName: "Bleu Marine",
		};
		render(<DeleteColorAlertDialog />);
		expect(screen.getByText(/Bleu Marine/)).toBeInTheDocument();
	});
});
