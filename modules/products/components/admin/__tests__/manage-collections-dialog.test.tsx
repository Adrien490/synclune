import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockIsOpen,
	mockDialogData,
	mockClose,
	mockUpdate,
	mockGetAllCollections,
	mockGetProductCollections,
} = vi.hoisted(() => ({
	mockIsOpen: { value: false },
	mockDialogData: {
		value: null as { productId: string; productTitle: string } | null,
	},
	mockClose: vi.fn(),
	mockUpdate: vi.fn(),
	mockGetAllCollections: vi.fn(),
	mockGetProductCollections: vi.fn(),
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: () => ({
		isOpen: mockIsOpen.value,
		data: mockDialogData.value,
		close: mockClose,
	}),
}));

vi.mock("@/modules/products/hooks/use-update-product-collections", () => ({
	useUpdateProductCollections: ({ onSuccess }: { onSuccess: () => void }) => ({
		update: (productId: string, collectionIds: string[]) => {
			mockUpdate(productId, collectionIds);
			onSuccess();
		},
		isPending: false,
	}),
}));

vi.mock("@/modules/products/data/get-product-collections", () => ({
	getAllCollections: () => mockGetAllCollections(),
	getProductCollections: (productId: string) => mockGetProductCollections(productId),
}));

vi.mock("@/shared/components/responsive-dialog", () => ({
	ResponsiveDialog: ({
		children,
		open,
	}: {
		children: React.ReactNode;
		open: boolean;
		onOpenChange?: (open: boolean) => void;
	}) => (open ? <div data-testid="dialog">{children}</div> : null),
	ResponsiveDialogContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="dialog-content">{children}</div>
	),
	ResponsiveDialogHeader: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="dialog-header">{children}</div>
	),
	ResponsiveDialogTitle: ({ children }: { children: React.ReactNode }) => (
		<h2 data-testid="dialog-title">{children}</h2>
	),
	ResponsiveDialogDescription: ({ children }: { children: React.ReactNode }) => (
		<p data-testid="dialog-description">{children}</p>
	),
	ResponsiveDialogFooter: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="dialog-footer">{children}</div>
	),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		onClick,
		type,
		disabled,
		...rest
	}: {
		children: React.ReactNode;
		onClick?: () => void;
		type?: "button" | "submit" | "reset";
		disabled?: boolean;
		[key: string]: unknown;
	}) => (
		<button type={type} onClick={onClick} disabled={disabled} {...rest}>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/ui/checkbox", () => ({
	Checkbox: ({
		id,
		checked,
		onCheckedChange,
		disabled,
	}: {
		id?: string;
		checked?: boolean;
		onCheckedChange?: () => void;
		disabled?: boolean;
	}) => (
		<input
			type="checkbox"
			id={id}
			checked={checked}
			onChange={onCheckedChange}
			disabled={disabled}
		/>
	),
}));

vi.mock("@phosphor-icons/react/ssr", () => ({
	SpinnerIcon: () => <svg data-testid="icon-loader" />,
	FolderOpenIcon: () => <svg data-testid="icon-folder-open" />,
}));

vi.mock("sonner", () => ({
	toast: { error: vi.fn() },
}));

// ============================================================================
// COMPONENT IMPORT (after mocks)
// ============================================================================

import { ManageCollectionsDialog } from "../manage-collections-dialog";

// ============================================================================
// HELPERS
// ============================================================================

const COLLECTIONS = [
	{ id: "col-1", name: "Été" },
	{ id: "col-2", name: "Hiver" },
];

function openDialog(productId = "prod-1", productTitle = "Bague Lune") {
	mockIsOpen.value = true;
	mockDialogData.value = { productId, productTitle };
}

// ============================================================================
// TESTS
// ============================================================================

afterEach(cleanup);

describe("ManageCollectionsDialog", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockIsOpen.value = false;
		mockDialogData.value = null;
		mockGetAllCollections.mockResolvedValue(COLLECTIONS);
		mockGetProductCollections.mockResolvedValue([]);
	});

	// ─── Closed state ─────────────────────────────────────────────────────────

	describe("closed state", () => {
		it("does not render when dialog is closed", () => {
			render(<ManageCollectionsDialog />);
			expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
		});
	});

	// ─── Open state ───────────────────────────────────────────────────────────

	describe("open state", () => {
		it("renders dialog when open", () => {
			openDialog();
			render(<ManageCollectionsDialog />);
			expect(screen.getByTestId("dialog")).toBeInTheDocument();
		});

		it("renders dialog title", () => {
			openDialog();
			render(<ManageCollectionsDialog />);
			expect(screen.getByTestId("dialog-title")).toHaveTextContent("Gérer les collections");
		});

		it("renders product title in description", () => {
			openDialog("prod-1", "Bague Lune");
			render(<ManageCollectionsDialog />);
			expect(screen.getByTestId("dialog-description")).toHaveTextContent("Bague Lune");
		});

		it("renders cancel and save buttons", () => {
			openDialog();
			render(<ManageCollectionsDialog />);
			expect(screen.getByRole("button", { name: "Annuler" })).toBeInTheDocument();
			expect(screen.getByRole("button", { name: "Enregistrer" })).toBeInTheDocument();
		});
	});

	// ─── Collections list ──────────────────────────────────────────────────────

	describe("collections list", () => {
		it("renders collections after loading", async () => {
			openDialog();
			render(<ManageCollectionsDialog />);
			await waitFor(() => {
				expect(screen.getByText("Été")).toBeInTheDocument();
				expect(screen.getByText("Hiver")).toBeInTheDocument();
			});
		});

		it("renders checkboxes for each collection", async () => {
			openDialog();
			render(<ManageCollectionsDialog />);
			await waitFor(() => {
				const checkboxes = screen.getAllByRole("checkbox");
				expect(checkboxes).toHaveLength(2);
			});
		});

		it("renders empty state when no collections available", async () => {
			mockGetAllCollections.mockResolvedValue([]);
			openDialog();
			render(<ManageCollectionsDialog />);
			await waitFor(() => {
				expect(screen.getByText("Aucune collection disponible")).toBeInTheDocument();
			});
		});

		it("pre-checks collections that product already belongs to", async () => {
			mockGetProductCollections.mockResolvedValue([{ id: "col-1", name: "Été" }]);
			openDialog();
			render(<ManageCollectionsDialog />);
			await waitFor(() => {
				const checkboxes = screen.getAllByRole("checkbox");
				expect(checkboxes[0]).toBeChecked();
				expect(checkboxes[1]).not.toBeChecked();
			});
		});
	});

	// ─── Toggle behavior ───────────────────────────────────────────────────────

	describe("toggle behavior", () => {
		it("checks a collection on click", async () => {
			openDialog();
			render(<ManageCollectionsDialog />);
			await waitFor(() => screen.getByText("Été"));
			const checkboxes = screen.getAllByRole("checkbox");
			fireEvent.click(checkboxes[0]!);
			expect(checkboxes[0]).toBeChecked();
		});

		it("unchecks a pre-selected collection on click", async () => {
			mockGetProductCollections.mockResolvedValue([{ id: "col-1", name: "Été" }]);
			openDialog();
			render(<ManageCollectionsDialog />);
			await waitFor(() => screen.getByText("Été"));
			const checkboxes = screen.getAllByRole("checkbox");
			expect(checkboxes[0]).toBeChecked();
			fireEvent.click(checkboxes[0]!);
			expect(checkboxes[0]).not.toBeChecked();
		});
	});

	// ─── Submit ────────────────────────────────────────────────────────────────

	describe("submit", () => {
		it("calls update with productId and selected collection ids on submit", async () => {
			openDialog("prod-1", "Bague Lune");
			render(<ManageCollectionsDialog />);
			await waitFor(() => screen.getByText("Été"));

			const checkboxes = screen.getAllByRole("checkbox");
			fireEvent.click(checkboxes[0]!);

			fireEvent.submit(screen.getByRole("button", { name: "Enregistrer" }).closest("form")!);
			expect(mockUpdate).toHaveBeenCalledWith("prod-1", ["col-1"]);
		});

		it("calls close after successful update", async () => {
			openDialog();
			render(<ManageCollectionsDialog />);
			await waitFor(() => screen.getByText("Été"));

			fireEvent.submit(screen.getByRole("button", { name: "Enregistrer" }).closest("form")!);
			expect(mockClose).toHaveBeenCalled();
		});

		it("calls close on cancel button click", async () => {
			openDialog();
			render(<ManageCollectionsDialog />);
			// Wait for collections to load so buttons are not disabled
			await waitFor(() => screen.getByText("Été"));
			fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
			expect(mockClose).toHaveBeenCalled();
		});
	});
});
