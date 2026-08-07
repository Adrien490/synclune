import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockIsOpen, mockClose, mockDialogData, mockAction, mockIsPending } = vi.hoisted(() => ({
	mockIsOpen: { value: false },
	mockClose: vi.fn(),
	mockDialogData: {
		value: null as {
			index: number;
			url: string;
			skipUtapiDelete?: boolean;
			onRemove: () => void;
		} | null,
	},
	mockAction: vi.fn(),
	mockIsPending: { value: false },
}));

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

vi.mock("@/modules/media/lib/uploadthing/use-delete-uploadthing-file", () => ({
	useDeleteUploadThingFile: ({ onSuccess }: { onSuccess: () => void }) => ({
		isPending: mockIsPending.value,
		action: (formData: FormData) => {
			mockAction(formData);
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
		className?: string;
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
		className?: string;
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

vi.mock("@phosphor-icons/react/ssr", async (importOriginal) => ({
	...((await importOriginal()) as Record<string, unknown>),
	SpinnerIcon: ({ className }: { className?: string }) => (
		<svg data-testid="icon-loader" className={className} />
	),
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { DeleteGalleryMediaAlertDialog } from "../delete-gallery-media-alert-dialog";

// ============================================================================
// TESTS
// ============================================================================

afterEach(cleanup);

describe("DeleteGalleryMediaAlertDialog", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockIsOpen.value = false;
		mockDialogData.value = null;
		mockIsPending.value = false;
	});

	it("renders nothing when closed", () => {
		mockIsOpen.value = false;
		const { container } = render(<DeleteGalleryMediaAlertDialog />);
		expect(container.firstChild).toBeNull();
	});

	it("renders dialog content when open", () => {
		mockIsOpen.value = true;
		mockDialogData.value = {
			index: 0,
			url: "https://utfs.io/f/img.jpg",
			onRemove: vi.fn(),
		};
		render(<DeleteGalleryMediaAlertDialog />);
		expect(screen.getByTestId("alert-dialog")).toBeInTheDocument();
	});

	it("renders title 'Confirmer la suppression'", () => {
		mockIsOpen.value = true;
		mockDialogData.value = { index: 0, url: "https://utfs.io/f/img.jpg", onRemove: vi.fn() };
		render(<DeleteGalleryMediaAlertDialog />);
		expect(screen.getByText("Confirmer la suppression")).toBeInTheDocument();
	});

	it("renders irreversible message when skipUtapiDelete is false", () => {
		mockIsOpen.value = true;
		mockDialogData.value = {
			index: 0,
			url: "https://utfs.io/f/img.jpg",
			skipUtapiDelete: false,
			onRemove: vi.fn(),
		};
		render(<DeleteGalleryMediaAlertDialog />);
		expect(screen.getByText(/irréversible/i)).toBeInTheDocument();
	});

	it("renders deferred message when skipUtapiDelete is true", () => {
		mockIsOpen.value = true;
		mockDialogData.value = {
			index: 0,
			url: "https://utfs.io/f/img.jpg",
			skipUtapiDelete: true,
			onRemove: vi.fn(),
		};
		render(<DeleteGalleryMediaAlertDialog />);
		expect(screen.getByText(/validation du formulaire/i)).toBeInTheDocument();
	});

	it("renders Annuler and Supprimer buttons", () => {
		mockIsOpen.value = true;
		mockDialogData.value = { index: 0, url: "https://utfs.io/f/img.jpg", onRemove: vi.fn() };
		render(<DeleteGalleryMediaAlertDialog />);
		expect(screen.getByTestId("cancel-btn")).toHaveTextContent("Annuler");
		expect(screen.getByTestId("confirm-btn")).toHaveTextContent("Supprimer");
	});

	it("calls onRemove and closes without UTAPI when skipUtapiDelete=true", async () => {
		const onRemove = vi.fn();
		mockIsOpen.value = true;
		mockDialogData.value = {
			index: 0,
			url: "https://utfs.io/f/img.jpg",
			skipUtapiDelete: true,
			onRemove,
		};
		render(<DeleteGalleryMediaAlertDialog />);
		await userEvent.click(screen.getByTestId("confirm-btn"));
		expect(onRemove).toHaveBeenCalledOnce();
		// La fermeture vient du `Close` de la confirmation, plus du handler.
		expect(mockAction).not.toHaveBeenCalled();
	});
});
