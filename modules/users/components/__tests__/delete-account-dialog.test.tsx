import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { useDeleteAccountMock } = vi.hoisted(() => ({
	useDeleteAccountMock: vi.fn(() => ({
		action: vi.fn(),
		isPending: false,
	})),
}));

vi.mock("@/modules/users/hooks/use-delete-account", () => ({
	useDeleteAccount: useDeleteAccountMock,
}));

vi.mock("@/modules/users/constants/user.constants", () => ({
	USER_CONSTANTS: {
		ACCOUNT_DELETION_CONFIRMATION: "SUPPRIMER",
	},
}));

vi.mock("lucide-react", () => ({
	Loader2: () => <span data-testid="loader-icon" />,
}));

// Render AlertDialog without portal behavior so content is always visible
vi.mock("@/shared/components/ui/alert-dialog", () => ({
	AlertDialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogCancel: ({
		children,
		disabled,
	}: {
		children: React.ReactNode;
		disabled?: boolean;
	}) => <button disabled={disabled}>{children}</button>,
	AlertDialogAction: ({
		children,
		disabled,
		type,
		...props
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		type?: string;
		[key: string]: unknown;
	}) => (
		<button type={type as "button" | "submit" | "reset"} disabled={disabled} {...props}>
			{children}
		</button>
	),
}));

import { DeleteAccountDialog } from "../delete-account-dialog";

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	useDeleteAccountMock.mockReturnValue({ action: vi.fn(), isPending: false });
});

describe("DeleteAccountDialog", () => {
	it("renders the trigger button", () => {
		render(<DeleteAccountDialog />);
		expect(screen.getByRole("button", { name: /Supprimer mon compte/i })).toBeInTheDocument();
	});

	it("renders the confirmation input field", () => {
		render(<DeleteAccountDialog />);
		expect(screen.getByRole("textbox", { name: /SUPPRIMER/i })).toBeInTheDocument();
	});

	it("submit button is disabled without confirmation text", () => {
		render(<DeleteAccountDialog />);
		const submitBtn = screen.getByRole("button", { name: /Demander la suppression/i });
		expect(submitBtn).toBeDisabled();
	});

	it("submit button enabled after typing the confirmation text", () => {
		render(<DeleteAccountDialog />);
		const input = screen.getByRole("textbox", { name: /SUPPRIMER/i });
		fireEvent.change(input, { target: { value: "SUPPRIMER" } });

		const submitBtn = screen.getByRole("button", { name: /Demander la suppression/i });
		expect(submitBtn).not.toBeDisabled();
	});

	it("submit button disabled with wrong confirmation text", () => {
		render(<DeleteAccountDialog />);
		const input = screen.getByRole("textbox", { name: /SUPPRIMER/i });
		fireEvent.change(input, { target: { value: "supprimer" } });

		const submitBtn = screen.getByRole("button", { name: /Demander la suppression/i });
		expect(submitBtn).toBeDisabled();
	});
});
