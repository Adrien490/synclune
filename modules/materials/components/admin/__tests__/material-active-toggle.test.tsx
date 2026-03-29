import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockToggleStatus } = vi.hoisted(() => ({
	mockToggleStatus: vi.fn(),
}));

vi.mock("@/modules/materials/hooks/use-toggle-material-status", () => ({
	useToggleMaterialStatus: () => ({ toggleStatus: mockToggleStatus, isPending: false }),
}));

vi.mock("@/shared/components/active-toggle", () => ({
	ActiveToggle: ({
		isActive,
		onToggle,
		isPending,
	}: {
		isActive: boolean;
		onToggle: (checked: boolean) => void;
		isPending?: boolean;
	}) => (
		<button
			role="switch"
			aria-checked={isActive}
			aria-label={isActive ? "Désactiver" : "Activer"}
			disabled={isPending}
			onClick={() => onToggle(!isActive)}
		/>
	),
}));

import { MaterialActiveToggle } from "../material-active-toggle";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("MaterialActiveToggle", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ─── Rendering ────────────────────────────────────────────────────────────

	it("renders a switch element", () => {
		render(<MaterialActiveToggle materialId="mat-1" isActive={false} />);
		expect(screen.getByRole("switch")).toBeInTheDocument();
	});

	it("renders as checked when isActive is true", () => {
		render(<MaterialActiveToggle materialId="mat-1" isActive={true} />);
		expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
	});

	it("renders as unchecked when isActive is false", () => {
		render(<MaterialActiveToggle materialId="mat-1" isActive={false} />);
		expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
	});

	it("shows 'Désactiver' aria-label when isActive is true", () => {
		render(<MaterialActiveToggle materialId="mat-1" isActive={true} />);
		expect(screen.getByRole("switch")).toHaveAttribute("aria-label", "Désactiver");
	});

	it("shows 'Activer' aria-label when isActive is false", () => {
		render(<MaterialActiveToggle materialId="mat-1" isActive={false} />);
		expect(screen.getByRole("switch")).toHaveAttribute("aria-label", "Activer");
	});

	// ─── Toggle interaction ───────────────────────────────────────────────────

	it("calls toggleStatus with materialId and true when toggling from inactive", () => {
		render(<MaterialActiveToggle materialId="mat-42" isActive={false} />);
		fireEvent.click(screen.getByRole("switch"));
		expect(mockToggleStatus).toHaveBeenCalledWith("mat-42", true);
	});

	it("calls toggleStatus with materialId and false when toggling from active", () => {
		render(<MaterialActiveToggle materialId="mat-42" isActive={true} />);
		fireEvent.click(screen.getByRole("switch"));
		expect(mockToggleStatus).toHaveBeenCalledWith("mat-42", false);
	});

	it("calls toggleStatus exactly once per click", () => {
		render(<MaterialActiveToggle materialId="mat-1" isActive={false} />);
		fireEvent.click(screen.getByRole("switch"));
		expect(mockToggleStatus).toHaveBeenCalledTimes(1);
	});
});
