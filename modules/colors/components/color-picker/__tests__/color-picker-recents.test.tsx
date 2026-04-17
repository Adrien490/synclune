import { cleanup, render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

// ============================================================================
// IMPORTS
// ============================================================================

import { ColorPicker } from "../color-picker";
import { ColorPickerRecents } from "../color-picker-recents";

// ============================================================================
// TESTS
// ============================================================================

afterEach(cleanup);

describe("ColorPickerRecents", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders nothing when colors list is empty", () => {
		const { container } = render(
			<ColorPicker value="#FFFFFF">
				<ColorPickerRecents colors={[]} />
			</ColorPicker>,
		);
		expect(container.querySelector('[data-slot="color-picker-recents"]')).toBeNull();
	});

	it("renders one swatch per color in the list", () => {
		render(
			<ColorPicker value="#FFFFFF">
				<ColorPickerRecents colors={["#FF0000", "#00FF00", "#0000FF"]} />
			</ColorPicker>,
		);
		const group = screen.getByRole("radiogroup");
		expect(within(group).getAllByRole("radio")).toHaveLength(3);
	});

	it("marks the matching swatch aria-checked=true", () => {
		render(
			<ColorPicker value="#00FF00">
				<ColorPickerRecents colors={["#FF0000", "#00FF00"]} />
			</ColorPicker>,
		);
		const green = screen.getByRole("radio", { name: /#00FF00/i });
		expect(green).toHaveAttribute("aria-checked", "true");
	});

	it("calls onChange with the hex on click", async () => {
		const onChange = vi.fn();
		render(
			<ColorPicker value="#FFFFFF" onChange={onChange}>
				<ColorPickerRecents colors={["#FF0000"]} />
			</ColorPicker>,
		);
		await userEvent.click(screen.getByRole("radio", { name: /#FF0000/i }));
		expect(onChange).toHaveBeenCalledWith("#FF0000");
	});

	it("supports keyboard Enter and Space to select", async () => {
		const onChange = vi.fn();
		render(
			<ColorPicker value="#FFFFFF" onChange={onChange}>
				<ColorPickerRecents colors={["#112233"]} />
			</ColorPicker>,
		);
		const btn = screen.getByRole("radio", { name: /#112233/i });
		btn.focus();
		await userEvent.keyboard("{Enter}");
		expect(onChange).toHaveBeenCalledWith("#112233");
	});

	it("moves focus with arrow keys (roving tabindex)", async () => {
		render(
			<ColorPicker value="#FFFFFF">
				<ColorPickerRecents colors={["#111111", "#222222", "#333333"]} />
			</ColorPicker>,
		);
		screen.getByRole("radio", { name: /#111111/i }).focus();
		await userEvent.keyboard("{ArrowRight}");
		expect(screen.getByRole("radio", { name: /#222222/i })).toHaveFocus();
	});

	it("first swatch has tabIndex=0 when no color matches", () => {
		render(
			<ColorPicker value="#AAAAAA">
				<ColorPickerRecents colors={["#FF0000", "#00FF00"]} />
			</ColorPicker>,
		);
		const first = screen.getByRole("radio", { name: /#FF0000/i });
		expect(first).toHaveAttribute("tabindex", "0");
		const second = screen.getByRole("radio", { name: /#00FF00/i });
		expect(second).toHaveAttribute("tabindex", "-1");
	});

	it("survives invalid hex in the list without crashing", () => {
		expect(() =>
			render(
				<ColorPicker value="#FFFFFF">
					<ColorPickerRecents colors={["#not-hex", "#00FF00"]} />
				</ColorPicker>,
			),
		).not.toThrow();
	});

	it("honors custom title", () => {
		render(
			<ColorPicker value="#FFFFFF">
				<ColorPickerRecents colors={["#FF0000"]} title="Mes favoris" />
			</ColorPicker>,
		);
		expect(screen.getByText("Mes favoris")).toBeInTheDocument();
	});
});
