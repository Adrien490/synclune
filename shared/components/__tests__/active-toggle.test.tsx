import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/components/ui/switch", () => ({
	Switch: ({
		checked,
		onCheckedChange,
		disabled,
		"aria-label": ariaLabel,
		...props
	}: {
		checked: boolean;
		onCheckedChange: (checked: boolean) => void;
		disabled?: boolean;
		"aria-label"?: string;
	}) => {
		const { createElement } = require("react");
		return createElement("button", {
			role: "switch",
			"aria-checked": String(checked),
			"aria-label": ariaLabel,
			disabled,
			onClick: () => onCheckedChange(!checked),
			...props,
		});
	},
}));

// Import AFTER mocks
import { ActiveToggle } from "../active-toggle";

// ============================================================================
// SETUP
// ============================================================================

beforeEach(() => {
	vi.clearAllMocks();
});

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("ActiveToggle", () => {
	it("renders a switch element", () => {
		render(<ActiveToggle isActive={false} onToggle={vi.fn()} />);

		expect(screen.getByRole("switch")).toBeInTheDocument();
	});

	it("renders as checked when isActive is true", () => {
		render(<ActiveToggle isActive={true} onToggle={vi.fn()} />);

		expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
	});

	it("renders as unchecked when isActive is false", () => {
		render(<ActiveToggle isActive={false} onToggle={vi.fn()} />);

		expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
	});

	it("calls onToggle with true when toggling from inactive state", () => {
		const onToggle = vi.fn();
		render(<ActiveToggle isActive={false} onToggle={onToggle} />);

		fireEvent.click(screen.getByRole("switch"));

		expect(onToggle).toHaveBeenCalledWith(true);
	});

	it("calls onToggle with false when toggling from active state", () => {
		const onToggle = vi.fn();
		render(<ActiveToggle isActive={true} onToggle={onToggle} />);

		fireEvent.click(screen.getByRole("switch"));

		expect(onToggle).toHaveBeenCalledWith(false);
	});

	it("shows activeLabel as aria-label when isActive is true", () => {
		render(
			<ActiveToggle
				isActive={true}
				onToggle={vi.fn()}
				activeLabel="Désactiver le produit"
				inactiveLabel="Activer le produit"
			/>,
		);

		expect(screen.getByRole("switch")).toHaveAttribute("aria-label", "Désactiver le produit");
	});

	it("shows inactiveLabel as aria-label when isActive is false", () => {
		render(
			<ActiveToggle
				isActive={false}
				onToggle={vi.fn()}
				activeLabel="Désactiver le produit"
				inactiveLabel="Activer le produit"
			/>,
		);

		expect(screen.getByRole("switch")).toHaveAttribute("aria-label", "Activer le produit");
	});

	it("uses default labels when none provided", () => {
		render(<ActiveToggle isActive={true} onToggle={vi.fn()} />);

		expect(screen.getByRole("switch")).toHaveAttribute("aria-label", "Désactiver");
	});

	it("is disabled when isPending is true", () => {
		render(<ActiveToggle isActive={false} onToggle={vi.fn()} isPending={true} />);

		expect(screen.getByRole("switch")).toBeDisabled();
	});

	it("is disabled when disabled prop is true", () => {
		render(<ActiveToggle isActive={false} onToggle={vi.fn()} disabled={true} />);

		expect(screen.getByRole("switch")).toBeDisabled();
	});

	it("does not call onToggle when disabled", () => {
		const onToggle = vi.fn();
		render(<ActiveToggle isActive={false} onToggle={onToggle} disabled={true} />);

		fireEvent.click(screen.getByRole("switch"));

		expect(onToggle).not.toHaveBeenCalled();
	});
});
