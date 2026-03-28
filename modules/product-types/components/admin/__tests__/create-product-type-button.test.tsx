import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockOpen } = vi.hoisted(() => ({
	mockOpen: vi.fn(),
}));

vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: () => ({ open: mockOpen }),
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
	});

	it("renders the button", () => {
		render(<CreateProductTypeButton />);
		expect(screen.getByTestId("create-product-type-button")).toBeInTheDocument();
	});

	it("shows 'Créer un type' text", () => {
		render(<CreateProductTypeButton />);
		expect(screen.getByText("Créer un type")).toBeInTheDocument();
	});

	it("calls dialog open when clicked", async () => {
		const user = userEvent.setup();
		render(<CreateProductTypeButton />);
		await user.click(screen.getByTestId("create-product-type-button"));
		expect(mockOpen).toHaveBeenCalledTimes(1);
	});

	it("calls open with no arguments", async () => {
		const user = userEvent.setup();
		render(<CreateProductTypeButton />);
		await user.click(screen.getByTestId("create-product-type-button"));
		expect(mockOpen).toHaveBeenCalledWith();
	});
});
