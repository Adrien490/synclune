import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockDialogOpen, mockUseDialog, mockUseIsMobile, mockRouterPush } = vi.hoisted(() => ({
	mockDialogOpen: vi.fn(),
	mockUseDialog: vi.fn(),
	mockUseIsMobile: vi.fn(),
	mockRouterPush: vi.fn(),
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: mockUseDialog,
}));

vi.mock("@/shared/hooks/use-mobile", () => ({
	useIsMobile: mockUseIsMobile,
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockRouterPush }),
}));

vi.mock("@/modules/addresses/constants/dialog.constants", () => ({
	ADDRESS_DIALOG_ID: "address-form",
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		onClick,
		...props
	}: {
		children: React.ReactNode;
		onClick?: () => void;
		[key: string]: unknown;
	}) => (
		<button onClick={onClick} {...props}>
			{children}
		</button>
	),
}));

// ============================================================================
// IMPORTS AFTER MOCKS
// ============================================================================

import { CreateAddressButton } from "../create-address-button";

// ============================================================================
// TESTS
// ============================================================================

afterEach(cleanup);

describe("CreateAddressButton", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUseDialog.mockReturnValue({
			open: mockDialogOpen,
			close: vi.fn(),
			isOpen: false,
			data: null,
		});
		// Desktop par défaut (la dialog reste le comportement par défaut des tests).
		mockUseIsMobile.mockReturnValue(false);
	});

	it("renders a button", () => {
		render(<CreateAddressButton />);
		expect(screen.getByRole("button")).toBeInTheDocument();
	});

	it("renders default label 'Ajouter une adresse'", () => {
		render(<CreateAddressButton />);
		expect(screen.getByText("Ajouter une adresse")).toBeInTheDocument();
	});

	it("renders custom children when provided", () => {
		render(<CreateAddressButton>Nouvelle adresse</CreateAddressButton>);
		expect(screen.getByText("Nouvelle adresse")).toBeInTheDocument();
	});

	it("does NOT render default label when children are provided", () => {
		render(<CreateAddressButton>Custom</CreateAddressButton>);
		expect(screen.queryByText("Ajouter une adresse")).not.toBeInTheDocument();
	});

	it("calls useDialog with ADDRESS_DIALOG_ID", () => {
		render(<CreateAddressButton />);
		expect(mockUseDialog).toHaveBeenCalledWith("address-form");
	});

	it("calls dialog.open() when clicked on desktop", async () => {
		mockUseIsMobile.mockReturnValue(false);
		render(<CreateAddressButton />);
		await userEvent.click(screen.getByRole("button"));
		expect(mockDialogOpen).toHaveBeenCalledOnce();
		expect(mockRouterPush).not.toHaveBeenCalled();
	});

	it("navigates to the dedicated page (not the dialog) when clicked on mobile", async () => {
		mockUseIsMobile.mockReturnValue(true);
		render(<CreateAddressButton />);
		await userEvent.click(screen.getByRole("button"));
		expect(mockRouterPush).toHaveBeenCalledWith("/adresses/nouvelle");
		expect(mockDialogOpen).not.toHaveBeenCalled();
	});
});
