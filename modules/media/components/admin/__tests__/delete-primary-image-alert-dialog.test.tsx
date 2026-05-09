import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockIsOpen, mockClose, mockDialogData, mockDeleteFiles, mockIsPending } = vi.hoisted(
	() => ({
		mockIsOpen: { value: false },
		mockClose: vi.fn(),
		mockDialogData: {
			value: null as {
				imageUrl: string;
				skipUtapiDelete?: boolean;
				onRemove: () => void;
			} | null,
		},
		mockDeleteFiles: vi.fn(),
		mockIsPending: { value: false },
	}),
);

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

vi.mock("@/shared/providers/alert-dialog-store-provider", () => ({
	useAlertDialog: () => ({
		isOpen: mockIsOpen.value,
		close: mockClose,
		data: mockDialogData.value,
	}),
}));

vi.mock("@/modules/media/lib/uploadthing/use-delete-uploadthing-files", () => ({
	useDeleteUploadThingFiles: ({ onSuccess }: { onSuccess: () => void }) => ({
		isPending: mockIsPending.value,
		deleteFiles: (url: string) => {
			mockDeleteFiles(url);
			onSuccess();
		},
	}),
}));

vi.mock("@/shared/components/ui/alert-dialog", () => ({
	AlertDialog: ({
		open,
		children,
	}: {
		open: boolean;
		onOpenChange?: (v: boolean) => void;
		children: React.ReactNode;
	}) => (open ? <div data-testid="alert-dialog">{children}</div> : null),
	AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
	AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
	AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogCancel: ({
		children,
		disabled,
		type,
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		type?: string;
	}) => (
		<button
			data-testid="cancel-btn"
			disabled={disabled}
			type={type as "button" | "submit" | "reset"}
		>
			{children}
		</button>
	),
	AlertDialogAction: ({
		children,
		disabled,
		onClick,
		"aria-busy": ariaBusy,
		type,
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		onClick?: () => void;
		"aria-busy"?: boolean;
		type?: string;
	}) => (
		<button
			data-testid="confirm-btn"
			disabled={disabled}
			onClick={onClick}
			aria-busy={ariaBusy}
			type={type as "button" | "submit" | "reset"}
		>
			{children}
		</button>
	),
}));

vi.mock("lucide-react", async (importOriginal) => ({
	...((await importOriginal()) as Record<string, unknown>),
	LoaderCircle: ({ className }: { className?: string }) => (
		<svg data-testid="icon-loader" className={className} />
	),
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { DeletePrimaryImageAlertDialog } from "../delete-primary-image-alert-dialog";

// ============================================================================
// TESTS
// ============================================================================

afterEach(cleanup);

describe("DeletePrimaryImageAlertDialog", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockIsOpen.value = false;
		mockDialogData.value = null;
		mockIsPending.value = false;
	});

	it("renders nothing when closed", () => {
		mockIsOpen.value = false;
		const { container } = render(<DeletePrimaryImageAlertDialog />);
		expect(container.firstChild).toBeNull();
	});

	it("renders dialog when open", () => {
		mockIsOpen.value = true;
		mockDialogData.value = { imageUrl: "https://utfs.io/f/img.jpg", onRemove: vi.fn() };
		render(<DeletePrimaryImageAlertDialog />);
		expect(screen.getByTestId("alert-dialog")).toBeInTheDocument();
	});

	it("renders 'Confirmer la suppression' title", () => {
		mockIsOpen.value = true;
		mockDialogData.value = { imageUrl: "https://utfs.io/f/img.jpg", onRemove: vi.fn() };
		render(<DeletePrimaryImageAlertDialog />);
		expect(screen.getByText("Confirmer la suppression")).toBeInTheDocument();
	});

	it("shows irreversible message for immediate delete", () => {
		mockIsOpen.value = true;
		mockDialogData.value = {
			imageUrl: "https://utfs.io/f/img.jpg",
			skipUtapiDelete: false,
			onRemove: vi.fn(),
		};
		render(<DeletePrimaryImageAlertDialog />);
		expect(screen.getByText(/irréversible/i)).toBeInTheDocument();
	});

	it("shows deferred message when skipUtapiDelete=true", () => {
		mockIsOpen.value = true;
		mockDialogData.value = {
			imageUrl: "https://utfs.io/f/img.jpg",
			skipUtapiDelete: true,
			onRemove: vi.fn(),
		};
		render(<DeletePrimaryImageAlertDialog />);
		expect(screen.getByText(/validation du formulaire/i)).toBeInTheDocument();
	});

	it("calls onRemove and closes without API call when skipUtapiDelete=true", async () => {
		const onRemove = vi.fn();
		mockIsOpen.value = true;
		mockDialogData.value = {
			imageUrl: "https://utfs.io/f/img.jpg",
			skipUtapiDelete: true,
			onRemove,
		};
		render(<DeletePrimaryImageAlertDialog />);
		await userEvent.click(screen.getByTestId("confirm-btn"));
		expect(onRemove).toHaveBeenCalledOnce();
		expect(mockClose).toHaveBeenCalledOnce();
		expect(mockDeleteFiles).not.toHaveBeenCalled();
	});

	it("disables buttons when isPending", () => {
		mockIsOpen.value = true;
		mockIsPending.value = true;
		mockDialogData.value = { imageUrl: "https://utfs.io/f/img.jpg", onRemove: vi.fn() };
		render(<DeletePrimaryImageAlertDialog />);
		expect(screen.getByTestId("cancel-btn")).toBeDisabled();
		expect(screen.getByTestId("confirm-btn")).toBeDisabled();
	});

	it("shows loader and 'Suppression…' when pending", () => {
		mockIsOpen.value = true;
		mockIsPending.value = true;
		mockDialogData.value = { imageUrl: "https://utfs.io/f/img.jpg", onRemove: vi.fn() };
		render(<DeletePrimaryImageAlertDialog />);
		expect(screen.getByTestId("icon-loader")).toBeInTheDocument();
		expect(screen.getByTestId("confirm-btn")).toHaveTextContent("Suppression…");
	});
});
