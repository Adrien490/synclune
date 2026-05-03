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
				color?: { id: string; name: string; slug: string; hex: string };
				onCreated?: (id: string) => void;
		  }
		| undefined;
}

const { mockDialog, mockCreateColorForm, mockEditColorForm } = vi.hoisted(() => ({
	mockDialog: { current: null as DialogState | null },
	mockCreateColorForm: vi.fn(),
	mockEditColorForm: vi.fn(),
}));

vi.mock("@/shared/providers/dialog-store-provider", () => ({
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

vi.mock("@/modules/colors/components/admin/create-color-form", () => ({
	CreateColorForm: (props: unknown) => {
		mockCreateColorForm(props);
		return <div data-testid="create-color-form" />;
	},
}));

vi.mock("@/modules/colors/components/admin/edit-color-form", () => ({
	EditColorForm: (props: unknown) => {
		mockEditColorForm(props);
		return <div data-testid="edit-color-form" />;
	},
}));

import { ColorFormDialog } from "../color-form-dialog";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("ColorFormDialog", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockDialog.current = { isOpen: false, close: vi.fn(), data: undefined };
	});

	it("does not render when dialog is closed", () => {
		mockDialog.current = { isOpen: false, close: vi.fn(), data: undefined };
		render(<ColorFormDialog />);
		expect(screen.queryByTestId("responsive-dialog")).not.toBeInTheDocument();
	});

	it("renders CreateColorForm in create mode (no color in data)", () => {
		const onCreated = vi.fn();
		mockDialog.current = { isOpen: true, close: vi.fn(), data: { onCreated } };
		render(<ColorFormDialog />);
		expect(screen.getByTestId("create-color-form")).toBeInTheDocument();
		expect(screen.queryByTestId("edit-color-form")).not.toBeInTheDocument();
		expect(screen.getByText("Créer une couleur")).toBeInTheDocument();
	});

	it("forwards onCreated, onSuccess and redirectOnSuccess=false to CreateColorForm", () => {
		const close = vi.fn();
		const onCreated = vi.fn();
		mockDialog.current = { isOpen: true, close, data: { onCreated } };
		render(<ColorFormDialog />);
		expect(mockCreateColorForm).toHaveBeenCalledTimes(1);
		const props = mockCreateColorForm.mock.calls[0]![0] as {
			onSuccess: () => void;
			onCreated: (id: string) => void;
			redirectOnSuccess: boolean;
		};
		expect(props.onSuccess).toBe(close);
		expect(props.onCreated).toBe(onCreated);
		expect(props.redirectOnSuccess).toBe(false);
	});

	it("renders EditColorForm in update mode (color provided)", () => {
		const color = { id: "c-1", name: "Rouge", slug: "rouge", hex: "#FF0000" };
		mockDialog.current = { isOpen: true, close: vi.fn(), data: { color } };
		render(<ColorFormDialog />);
		expect(screen.getByTestId("edit-color-form")).toBeInTheDocument();
		expect(screen.queryByTestId("create-color-form")).not.toBeInTheDocument();
		expect(screen.getByText("Modifier la couleur")).toBeInTheDocument();
	});

	it("forwards color, onSuccess and redirectOnSuccess=false to EditColorForm", () => {
		const close = vi.fn();
		const color = { id: "c-1", name: "Rouge", slug: "rouge", hex: "#FF0000" };
		mockDialog.current = { isOpen: true, close, data: { color } };
		render(<ColorFormDialog />);
		const props = mockEditColorForm.mock.calls[0]![0] as {
			color: typeof color;
			onSuccess: () => void;
			redirectOnSuccess: boolean;
		};
		expect(props.color).toEqual(color);
		expect(props.onSuccess).toBe(close);
		expect(props.redirectOnSuccess).toBe(false);
	});

	it("calls close when ResponsiveDialog onOpenChange fires with false", async () => {
		const user = (await import("@testing-library/user-event")).default.setup();
		const close = vi.fn();
		mockDialog.current = { isOpen: true, close, data: undefined };
		render(<ColorFormDialog />);
		await user.click(screen.getByTestId("trigger-close"));
		expect(close).toHaveBeenCalledTimes(1);
	});
});
