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
				material?: {
					id: string;
					name: string;
					slug: string;
					description: string | null;
					active: boolean;
				};
				onCreated?: (id: string) => void;
		  }
		| undefined;
}

const { mockDialog, mockCreateMaterialForm, mockEditMaterialForm } = vi.hoisted(() => ({
	mockDialog: { current: null as DialogState | null },
	mockCreateMaterialForm: vi.fn(),
	mockEditMaterialForm: vi.fn(),
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

vi.mock("@/modules/materials/components/admin/create-material-form", () => ({
	CreateMaterialForm: (props: unknown) => {
		mockCreateMaterialForm(props);
		return <div data-testid="create-material-form" />;
	},
}));

vi.mock("@/modules/materials/components/admin/edit-material-form", () => ({
	EditMaterialForm: (props: unknown) => {
		mockEditMaterialForm(props);
		return <div data-testid="edit-material-form" />;
	},
}));

import { MaterialFormDialog } from "../material-form-dialog";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("MaterialFormDialog", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockDialog.current = { isOpen: false, close: vi.fn(), data: undefined };
	});

	it("does not render when dialog is closed", () => {
		mockDialog.current = { isOpen: false, close: vi.fn(), data: undefined };
		render(<MaterialFormDialog />);
		expect(screen.queryByTestId("responsive-dialog")).not.toBeInTheDocument();
	});

	it("renders CreateMaterialForm in create mode", () => {
		mockDialog.current = { isOpen: true, close: vi.fn(), data: undefined };
		render(<MaterialFormDialog />);
		expect(screen.getByTestId("create-material-form")).toBeInTheDocument();
		expect(screen.queryByTestId("edit-material-form")).not.toBeInTheDocument();
		expect(screen.getByText("Créer un matériau")).toBeInTheDocument();
	});

	it("forwards onCreated, onSuccess and redirectOnSuccess=false to CreateMaterialForm", () => {
		const close = vi.fn();
		const onCreated = vi.fn();
		mockDialog.current = { isOpen: true, close, data: { onCreated } };
		render(<MaterialFormDialog />);
		const props = mockCreateMaterialForm.mock.calls[0]![0] as {
			onSuccess: () => void;
			onCreated: (id: string) => void;
			redirectOnSuccess: boolean;
		};
		expect(props.onSuccess).toBe(close);
		expect(props.onCreated).toBe(onCreated);
		expect(props.redirectOnSuccess).toBe(false);
	});

	it("renders EditMaterialForm in update mode", () => {
		const material = {
			id: "m-1",
			name: "Argent 925",
			slug: "argent-925",
			description: null,
			active: true,
		};
		mockDialog.current = { isOpen: true, close: vi.fn(), data: { material } };
		render(<MaterialFormDialog />);
		expect(screen.getByTestId("edit-material-form")).toBeInTheDocument();
		expect(screen.queryByTestId("create-material-form")).not.toBeInTheDocument();
		expect(screen.getByText("Modifier le matériau")).toBeInTheDocument();
	});

	it("forwards material, onSuccess and redirectOnSuccess=false to EditMaterialForm", () => {
		const close = vi.fn();
		const material = {
			id: "m-1",
			name: "Argent 925",
			slug: "argent-925",
			description: "Argent massif",
			active: true,
		};
		mockDialog.current = { isOpen: true, close, data: { material } };
		render(<MaterialFormDialog />);
		const props = mockEditMaterialForm.mock.calls[0]![0] as {
			material: typeof material;
			onSuccess: () => void;
			redirectOnSuccess: boolean;
		};
		expect(props.material).toEqual(material);
		expect(props.onSuccess).toBe(close);
		expect(props.redirectOnSuccess).toBe(false);
	});

	it("calls close when ResponsiveDialog onOpenChange fires with false", async () => {
		const user = (await import("@testing-library/user-event")).default.setup();
		const close = vi.fn();
		mockDialog.current = { isOpen: true, close, data: undefined };
		render(<MaterialFormDialog />);
		await user.click(screen.getByTestId("trigger-close"));
		expect(close).toHaveBeenCalledTimes(1);
	});
});
