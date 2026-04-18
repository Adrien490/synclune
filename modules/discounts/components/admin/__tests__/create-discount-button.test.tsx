import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockOpen, mockHaptic } = vi.hoisted(() => ({
	mockOpen: vi.fn(),
	mockHaptic: vi.fn(),
}));

vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: () => ({ open: mockOpen }),
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => mockHaptic,
	triggerHaptic: mockHaptic,
}));

vi.mock("@/modules/discounts/components/admin/discount-form-dialog", () => ({
	DISCOUNT_DIALOG_ID: "discount-form",
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		onClick,
		size,
	}: {
		children: React.ReactNode;
		onClick?: () => void;
		size?: string;
	}) => (
		<button data-testid="create-discount-button" onClick={onClick} data-size={size}>
			{children}
		</button>
	),
}));

import { CreateDiscountButton } from "../create-discount-button";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("CreateDiscountButton", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders the button", () => {
		render(<CreateDiscountButton />);
		expect(screen.getByTestId("create-discount-button")).toBeInTheDocument();
	});

	it("shows 'Nouveau code' text", () => {
		render(<CreateDiscountButton />);
		expect(screen.getByText("Nouveau code")).toBeInTheDocument();
	});

	it("calls dialog open when clicked", async () => {
		const user = userEvent.setup();
		render(<CreateDiscountButton />);
		await user.click(screen.getByTestId("create-discount-button"));
		expect(mockOpen).toHaveBeenCalledTimes(1);
	});

	it("triggers selection haptic when clicked", async () => {
		const user = userEvent.setup();
		render(<CreateDiscountButton />);
		await user.click(screen.getByTestId("create-discount-button"));
		expect(mockHaptic).toHaveBeenCalledWith("selection");
	});
});
