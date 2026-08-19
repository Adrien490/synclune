import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

interface DialogState {
	isOpen: boolean;
	close: ReturnType<typeof vi.fn>;
	data:
		| {
				productType?: {
					id: string;
					label: string;
					slug: string;
					description: string | null;
				};
				onCreated?: (id: string) => void;
		  }
		| undefined;
}

const { mockDialog, mockCreateProductTypeForm, mockEditProductTypeForm } = vi.hoisted(() => ({
	mockDialog: { current: null as DialogState | null },
	mockCreateProductTypeForm: vi.fn(),
	mockEditProductTypeForm: vi.fn(),
}));

vi.mock("@/shared/providers/overlay-store-provider", () => ({
	useDialog: () => mockDialog.current,
}));

vi.mock("@/shared/components/responsive-dialog", () => ({
	ResponsiveDialog: ({
		open,
		onOpenChange,
		children,
	}: {
		open: boolean;
		onOpenChange: (open: boolean) => void;
		children: React.ReactNode;
	}) =>
		open ? (
			<div data-testid="responsive-dialog">
				<button data-testid="trigger-close" onClick={() => onOpenChange(false)}>
					close
				</button>
				{children}
			</div>
		) : null,
	ResponsiveDialogContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="responsive-dialog-content">{children}</div>
	),
	ResponsiveDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	ResponsiveDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
	ResponsiveDialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock("@/modules/product-types/components/admin/create-product-type-form", () => ({
	CreateProductTypeForm: (props: unknown) => {
		mockCreateProductTypeForm(props);
		return <div data-testid="create-product-type-form" />;
	},
}));

vi.mock("@/modules/product-types/components/admin/edit-product-type-form", () => ({
	EditProductTypeForm: (props: unknown) => {
		mockEditProductTypeForm(props);
		return <div data-testid="edit-product-type-form" />;
	},
}));

import { ProductTypeFormDialog } from "../product-type-form-dialog";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("ProductTypeFormDialog", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockDialog.current = { isOpen: false, close: vi.fn(), data: undefined };
	});

	it("does not render when dialog is closed", () => {
		mockDialog.current = { isOpen: false, close: vi.fn(), data: undefined };
		render(<ProductTypeFormDialog />);
		expect(screen.queryByTestId("responsive-dialog")).not.toBeInTheDocument();
	});

	it("renders CreateProductTypeForm in create mode", () => {
		mockDialog.current = { isOpen: true, close: vi.fn(), data: undefined };
		render(<ProductTypeFormDialog />);
		expect(screen.getByTestId("create-product-type-form")).toBeInTheDocument();
		expect(screen.queryByTestId("edit-product-type-form")).not.toBeInTheDocument();
		expect(screen.getByText("Créer un type de bijou")).toBeInTheDocument();
	});

	it("forwards onCreated, onSuccess and redirectOnSuccess=false to CreateProductTypeForm", () => {
		const close = vi.fn();
		const onCreated = vi.fn();
		mockDialog.current = { isOpen: true, close, data: { onCreated } };
		render(<ProductTypeFormDialog />);
		const props = mockCreateProductTypeForm.mock.calls[0]![0] as {
			onSuccess: () => void;
			onCreated: (id: string) => void;
			redirectOnSuccess: boolean;
		};
		expect(props.onSuccess).toBe(close);
		expect(props.onCreated).toBe(onCreated);
		expect(props.redirectOnSuccess).toBe(false);
	});

	it("renders EditProductTypeForm in update mode", () => {
		const productType = {
			id: "pt-1",
			label: "Colliers",
			slug: "colliers",
			description: "Types de colliers",
		};
		mockDialog.current = { isOpen: true, close: vi.fn(), data: { productType } };
		render(<ProductTypeFormDialog />);
		expect(screen.getByTestId("edit-product-type-form")).toBeInTheDocument();
		expect(screen.queryByTestId("create-product-type-form")).not.toBeInTheDocument();
		expect(screen.getByText("Modifier le type de bijou")).toBeInTheDocument();
	});

	it("forwards productType, onSuccess and redirectOnSuccess=false to EditProductTypeForm", () => {
		const close = vi.fn();
		const productType = {
			id: "pt-1",
			label: "Colliers",
			slug: "colliers",
			description: null,
		};
		mockDialog.current = { isOpen: true, close, data: { productType } };
		render(<ProductTypeFormDialog />);
		const props = mockEditProductTypeForm.mock.calls[0]![0] as {
			productType: typeof productType;
			onSuccess: () => void;
			redirectOnSuccess: boolean;
		};
		expect(props.productType).toEqual(productType);
		expect(props.onSuccess).toBe(close);
		expect(props.redirectOnSuccess).toBe(false);
	});

	it("calls close when ResponsiveDialog onOpenChange fires with false", async () => {
		const user = (await import("@testing-library/user-event")).default.setup();
		const close = vi.fn();
		mockDialog.current = { isOpen: true, close, data: undefined };
		render(<ProductTypeFormDialog />);
		await user.click(screen.getByTestId("trigger-close"));
		expect(close).toHaveBeenCalledTimes(1);
	});
});
