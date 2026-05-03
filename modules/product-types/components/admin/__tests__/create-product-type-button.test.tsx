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

vi.mock("@/modules/product-types/components/product-type-form-dialog", () => ({
	PRODUCT_TYPE_DIALOG_ID: "product-type-form",
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
		<button data-testid="create-product-type-button" onClick={onClick}>
			{children}
		</button>
	),
}));

import { CreateProductTypeButton } from "../create-product-type-button";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("CreateProductTypeButton", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockIsMobile.current = false;
	});

	it("renders the button", () => {
		render(<CreateProductTypeButton />);
		expect(screen.getByTestId("create-product-type-button")).toBeInTheDocument();
	});

	it("shows 'Créer un type' text", () => {
		render(<CreateProductTypeButton />);
		expect(screen.getByText("Créer un type")).toBeInTheDocument();
	});

	it("opens the dialog on desktop", async () => {
		const user = userEvent.setup();
		render(<CreateProductTypeButton />);
		await user.click(screen.getByTestId("create-product-type-button"));
		expect(mockOpen).toHaveBeenCalledTimes(1);
		expect(mockOpen).toHaveBeenCalledWith();
		expect(mockPush).not.toHaveBeenCalled();
	});

	it("navigates to the dedicated page on mobile", async () => {
		mockIsMobile.current = true;
		const user = userEvent.setup();
		render(<CreateProductTypeButton />);
		await user.click(screen.getByTestId("create-product-type-button"));
		expect(mockPush).toHaveBeenCalledWith("/admin/catalogue/types-de-produits/nouveau");
		expect(mockOpen).not.toHaveBeenCalled();
	});
});
