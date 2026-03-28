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

vi.mock("@/modules/colors/components/color-form-dialog", () => ({
	COLOR_DIALOG_ID: "color-form",
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		onClick,
	}: {
		children: React.ReactNode;
		onClick?: () => void;
		[key: string]: unknown;
	}) => (
		<button data-testid="create-color-button" onClick={onClick}>
			{children}
		</button>
	),
}));

import { CreateColorButton } from "../create-color-button";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("CreateColorButton", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ─── Rendering ────────────────────────────────────────────────────────────

	it("renders the button", () => {
		render(<CreateColorButton />);
		expect(screen.getByTestId("create-color-button")).toBeInTheDocument();
	});

	it("shows 'Créer une couleur' text", () => {
		render(<CreateColorButton />);
		expect(screen.getByText("Créer une couleur")).toBeInTheDocument();
	});

	// ─── Interaction ──────────────────────────────────────────────────────────

	it("calls dialog open when clicked", async () => {
		const user = userEvent.setup();
		render(<CreateColorButton />);
		await user.click(screen.getByTestId("create-color-button"));
		expect(mockOpen).toHaveBeenCalledTimes(1);
	});

	it("calls dialog open with no arguments", async () => {
		const user = userEvent.setup();
		render(<CreateColorButton />);
		await user.click(screen.getByTestId("create-color-button"));
		expect(mockOpen).toHaveBeenCalledWith();
	});
});
