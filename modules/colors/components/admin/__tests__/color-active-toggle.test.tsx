import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockToggleStatus, mockIsPending } = vi.hoisted(() => ({
	mockToggleStatus: vi.fn(),
	mockIsPending: { value: false },
}));

vi.mock("@/modules/colors/hooks/use-toggle-color-status", () => ({
	useToggleColorStatus: () => ({
		toggleStatus: mockToggleStatus,
		isPending: mockIsPending.value,
	}),
}));

vi.mock("@/shared/components/active-toggle", () => ({
	ActiveToggle: ({
		isActive,
		onToggle,
		isPending,
	}: {
		isActive: boolean;
		onToggle: (checked: boolean) => void;
		isPending: boolean;
	}) => (
		<button
			data-testid="active-toggle"
			data-active={isActive}
			data-pending={isPending}
			onClick={() => onToggle(!isActive)}
			role="switch"
			aria-checked={isActive}
		>
			{isActive ? "Actif" : "Inactif"}
		</button>
	),
}));

import { ColorActiveToggle } from "../color-active-toggle";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("ColorActiveToggle", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockIsPending.value = false;
	});

	// ─── Rendering ────────────────────────────────────────────────────────────

	it("renders ActiveToggle", () => {
		render(<ColorActiveToggle colorId="c-1" isActive={true} />);
		expect(screen.getByTestId("active-toggle")).toBeInTheDocument();
	});

	it("renders with isActive=true", () => {
		render(<ColorActiveToggle colorId="c-1" isActive={true} />);
		expect(screen.getByTestId("active-toggle")).toHaveAttribute("data-active", "true");
	});

	it("renders with isActive=false", () => {
		render(<ColorActiveToggle colorId="c-1" isActive={false} />);
		expect(screen.getByTestId("active-toggle")).toHaveAttribute("data-active", "false");
	});

	it("shows 'Actif' text when isActive=true", () => {
		render(<ColorActiveToggle colorId="c-1" isActive={true} />);
		expect(screen.getByText("Actif")).toBeInTheDocument();
	});

	it("shows 'Inactif' text when isActive=false", () => {
		render(<ColorActiveToggle colorId="c-1" isActive={false} />);
		expect(screen.getByText("Inactif")).toBeInTheDocument();
	});

	// ─── Interaction ──────────────────────────────────────────────────────────

	it("calls toggleStatus when toggle is clicked", async () => {
		const user = userEvent.setup();
		render(<ColorActiveToggle colorId="c-42" isActive={true} />);
		await user.click(screen.getByTestId("active-toggle"));
		expect(mockToggleStatus).toHaveBeenCalledWith("c-42", false);
	});

	it("calls toggleStatus with true when toggling from inactive", async () => {
		const user = userEvent.setup();
		render(<ColorActiveToggle colorId="c-42" isActive={false} />);
		await user.click(screen.getByTestId("active-toggle"));
		expect(mockToggleStatus).toHaveBeenCalledWith("c-42", true);
	});

	// ─── Pending state ────────────────────────────────────────────────────────

	it("passes isPending=true to ActiveToggle when hook is pending", () => {
		mockIsPending.value = true;
		render(<ColorActiveToggle colorId="c-1" isActive={true} />);
		expect(screen.getByTestId("active-toggle")).toHaveAttribute("data-pending", "true");
	});

	it("passes isPending=false to ActiveToggle when hook is not pending", () => {
		mockIsPending.value = false;
		render(<ColorActiveToggle colorId="c-1" isActive={true} />);
		expect(screen.getByTestId("active-toggle")).toHaveAttribute("data-pending", "false");
	});
});
