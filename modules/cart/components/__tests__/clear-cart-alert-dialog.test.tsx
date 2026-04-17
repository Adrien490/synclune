import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { mockClearAction, mockClearPending, mockCloseDialog, mockDialogOpen, mockHaptic } =
	vi.hoisted(() => ({
		mockClearAction: vi.fn(),
		mockClearPending: { current: false },
		mockCloseDialog: vi.fn(),
		mockDialogOpen: { current: true },
		mockHaptic: vi.fn(),
	}));

vi.mock("@/shared/providers/alert-dialog-store-provider", () => ({
	useAlertDialog: () => ({
		isOpen: mockDialogOpen.current,
		close: mockCloseDialog,
		data: undefined,
	}),
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => mockHaptic,
}));

vi.mock("../../hooks/use-clear-cart", () => ({
	useClearCart: (onSuccess?: () => void) => {
		mockClearAction.mockImplementation(() => {
			onSuccess?.();
		});
		return {
			state: undefined,
			action: mockClearAction,
			isPending: mockClearPending.current,
		};
	},
}));

vi.mock("@/shared/components/ui/alert-dialog", () => ({
	AlertDialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
		open ? <div role="alertdialog">{children}</div> : null,
	AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
	AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
	AlertDialogAction: ({
		children,
		disabled,
		type,
		...rest
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		type?: "submit" | "button";
	} & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
		<button type={type ?? "button"} disabled={disabled} {...rest}>
			{children}
		</button>
	),
	AlertDialogCancel: ({
		children,
		disabled,
	}: {
		children: React.ReactNode;
		disabled?: boolean;
	}) => (
		<button type="button" disabled={disabled}>
			{children}
		</button>
	),
}));

vi.mock("lucide-react", () => ({
	LoaderCircle: () => <svg data-testid="loader-icon" />,
}));

import { ClearCartAlertDialog } from "../clear-cart-alert-dialog";

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	mockClearPending.current = false;
	mockDialogOpen.current = true;
});

describe("ClearCartAlertDialog", () => {
	it("renders title + description when open", () => {
		render(<ClearCartAlertDialog />);
		expect(screen.getByText(/vider votre panier/i)).toBeInTheDocument();
		expect(
			screen.getByText(/tous les articles de votre panier seront supprimés/i),
		).toBeInTheDocument();
	});

	it("does not render when dialog is closed", () => {
		mockDialogOpen.current = false;
		render(<ClearCartAlertDialog />);
		expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
	});

	it("fires error haptic and calls action on submit, then closes dialog on success", () => {
		render(<ClearCartAlertDialog />);
		const form = screen.getByRole("form", { name: /vider le panier/i });
		fireEvent.submit(form);
		expect(mockHaptic).toHaveBeenCalledWith("error");
		expect(mockClearAction).toHaveBeenCalledTimes(1);
		expect(mockCloseDialog).toHaveBeenCalled();
	});

	it("shows loader inside action button while pending", () => {
		mockClearPending.current = true;
		render(<ClearCartAlertDialog />);
		expect(screen.getByTestId("loader-icon")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /suppression/i })).toBeDisabled();
	});
});
