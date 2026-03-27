import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { Kbd, KbdGroup } from "../kbd";

// ============================================================================
// Kbd
// ============================================================================

describe("Kbd", () => {
	afterEach(cleanup);

	it("renders a kbd element", () => {
		render(<Kbd>Ctrl</Kbd>);
		const el = screen.getByText("Ctrl");
		expect(el.tagName).toBe("KBD");
	});

	it("has data-slot='kbd'", () => {
		render(<Kbd>K</Kbd>);
		const el = screen.getByText("K");
		expect(el).toHaveAttribute("data-slot", "kbd");
	});

	it("renders children text", () => {
		render(<Kbd>Enter</Kbd>);
		expect(screen.getByText("Enter")).toBeInTheDocument();
	});

	it("applies custom className", () => {
		render(<Kbd className="custom-class">X</Kbd>);
		expect(screen.getByText("X").className).toContain("custom-class");
	});
});

// ============================================================================
// KbdGroup
// ============================================================================

describe("KbdGroup", () => {
	afterEach(cleanup);

	it("has data-slot='kbd-group'", () => {
		render(
			<KbdGroup data-testid="group">
				<Kbd>Ctrl</Kbd>
			</KbdGroup>,
		);
		expect(screen.getByTestId("group")).toHaveAttribute("data-slot", "kbd-group");
	});
});
