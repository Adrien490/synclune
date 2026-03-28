import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockAction, mockIsPending } = vi.hoisted(() => ({
	mockAction: vi.fn(),
	mockIsPending: { value: false },
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

vi.mock("@/modules/cart/hooks/use-remove-unavailable-items", () => ({
	useRemoveUnavailableItems: () => ({ action: mockAction, isPending: mockIsPending.value }),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		disabled,
		onClick,
		"aria-busy": ariaBusy,
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		onClick?: () => void;
		"aria-busy"?: boolean;
	}) => (
		<button disabled={disabled} onClick={onClick} aria-busy={ariaBusy}>
			{children}
		</button>
	),
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { RemoveUnavailableItemsButton } from "../remove-unavailable-items-button";

// ============================================================================
// TESTS
// ============================================================================

afterEach(cleanup);

describe("RemoveUnavailableItemsButton", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockIsPending.value = false;
	});

	it("renders with correct label showing item count", () => {
		render(<RemoveUnavailableItemsButton itemsCount={3} unavailableQuantity={2} />);
		expect(
			screen.getByRole("button", { name: /Retirer les articles indisponibles \(3\)/i }),
		).toBeInTheDocument();
	});

	it("shows 'Suppression en cours...' when isPending", () => {
		mockIsPending.value = true;
		render(<RemoveUnavailableItemsButton itemsCount={2} unavailableQuantity={1} />);
		expect(screen.getByRole("button")).toHaveTextContent("Suppression en cours...");
	});

	it("is disabled when isPending", () => {
		mockIsPending.value = true;
		render(<RemoveUnavailableItemsButton itemsCount={2} unavailableQuantity={1} />);
		expect(screen.getByRole("button")).toBeDisabled();
	});

	it("calls action with FormData when clicked", async () => {
		render(<RemoveUnavailableItemsButton itemsCount={1} unavailableQuantity={3} />);
		await userEvent.click(screen.getByRole("button"));
		expect(mockAction).toHaveBeenCalledOnce();
		expect(mockAction).toHaveBeenCalledWith(expect.any(FormData));
	});

	it("has aria-busy=true when pending", () => {
		mockIsPending.value = true;
		render(<RemoveUnavailableItemsButton itemsCount={1} unavailableQuantity={1} />);
		expect(screen.getByRole("button")).toHaveAttribute("aria-busy", "true");
	});
});
