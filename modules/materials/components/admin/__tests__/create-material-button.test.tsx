import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockOpen, mockPush, mockIsMobile } = vi.hoisted(() => ({
	mockOpen: vi.fn(),
	mockPush: vi.fn(),
	mockIsMobile: { current: false },
}));

vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: () => ({ open: mockOpen }),
}));

vi.mock("@/shared/hooks/use-mobile", () => ({
	useIsMobile: () => mockIsMobile.current,
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/modules/materials/components/material-form-dialog", () => ({
	MATERIAL_DIALOG_ID: "material-form",
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
		<button data-testid="create-material-button" onClick={onClick}>
			{children}
		</button>
	),
}));

import { CreateMaterialButton } from "../create-material-button";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("CreateMaterialButton", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockIsMobile.current = false;
	});

	it("renders the button", () => {
		render(<CreateMaterialButton />);
		expect(screen.getByTestId("create-material-button")).toBeInTheDocument();
	});

	it("shows 'Créer un matériau' text", () => {
		render(<CreateMaterialButton />);
		expect(screen.getByText("Créer un matériau")).toBeInTheDocument();
	});

	it("opens the dialog on desktop", async () => {
		const user = userEvent.setup();
		render(<CreateMaterialButton />);
		await user.click(screen.getByTestId("create-material-button"));
		expect(mockOpen).toHaveBeenCalledTimes(1);
		expect(mockPush).not.toHaveBeenCalled();
	});

	it("navigates to the dedicated page on mobile", async () => {
		mockIsMobile.current = true;
		const user = userEvent.setup();
		render(<CreateMaterialButton />);
		await user.click(screen.getByTestId("create-material-button"));
		expect(mockPush).toHaveBeenCalledWith("/admin/catalogue/materiaux/nouveau");
		expect(mockOpen).not.toHaveBeenCalled();
	});
});
