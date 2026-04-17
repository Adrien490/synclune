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
import { ColorPickerPalette } from "../color-picker-palette";
import { JEWELRY_PALETTE } from "../../../constants/jewelry-palette";

// ============================================================================
// TESTS
// ============================================================================

afterEach(cleanup);

describe("ColorPickerPalette", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders all 12 jewelry swatches", () => {
		render(
			<ColorPicker value="#FFFFFF">
				<ColorPickerPalette />
			</ColorPicker>,
		);
		const group = screen.getByRole("radiogroup");
		const swatches = within(group).getAllByRole("radio");
		expect(swatches).toHaveLength(JEWELRY_PALETTE.length);
		expect(swatches).toHaveLength(12);
	});

	it("exposes each swatch with aria-label and hex", () => {
		render(
			<ColorPicker value="#FFFFFF">
				<ColorPickerPalette />
			</ColorPicker>,
		);
		expect(screen.getByRole("radio", { name: /Or 18 carats.*#D4AF37/i })).toBeInTheDocument();
		expect(screen.getByRole("radio", { name: /Argent 925.*#C0C0C0/i })).toBeInTheDocument();
	});

	it("marks the matching swatch aria-checked=true", () => {
		render(
			<ColorPicker value="#D4AF37">
				<ColorPickerPalette />
			</ColorPicker>,
		);
		const or18 = screen.getByRole("radio", { name: /Or 18 carats/i });
		expect(or18).toHaveAttribute("aria-checked", "true");
	});

	it("marks non-matching swatches aria-checked=false", () => {
		render(
			<ColorPicker value="#FFFFFF">
				<ColorPickerPalette />
			</ColorPicker>,
		);
		const or18 = screen.getByRole("radio", { name: /Or 18 carats/i });
		expect(or18).toHaveAttribute("aria-checked", "false");
	});

	it("calls onChange with the swatch hex on click", async () => {
		const onChange = vi.fn();
		render(
			<ColorPicker value="#FFFFFF" onChange={onChange}>
				<ColorPickerPalette />
			</ColorPicker>,
		);
		await userEvent.click(screen.getByRole("radio", { name: /Or 18 carats/i }));
		expect(onChange).toHaveBeenCalledWith("#D4AF37");
	});

	it("calls onChange when pressing Enter on a focused swatch", async () => {
		const onChange = vi.fn();
		render(
			<ColorPicker value="#FFFFFF" onChange={onChange}>
				<ColorPickerPalette />
			</ColorPicker>,
		);
		const rubis = screen.getByRole("radio", { name: /Rubis/i });
		rubis.focus();
		await userEvent.keyboard("{Enter}");
		expect(onChange).toHaveBeenCalledWith("#9B111E");
	});

	it("calls onChange when pressing Space on a focused swatch", async () => {
		const onChange = vi.fn();
		render(
			<ColorPicker value="#FFFFFF" onChange={onChange}>
				<ColorPickerPalette />
			</ColorPicker>,
		);
		const saphir = screen.getByRole("radio", { name: /Saphir/i });
		saphir.focus();
		await userEvent.keyboard(" ");
		expect(onChange).toHaveBeenCalledWith("#0F52BA");
	});

	it("moves focus with ArrowRight (roving tabindex)", async () => {
		render(
			<ColorPicker value="#FFFFFF">
				<ColorPickerPalette />
			</ColorPicker>,
		);
		const first = screen.getByRole("radio", { name: /Or 18 carats/i });
		first.focus();
		await userEvent.keyboard("{ArrowRight}");
		expect(screen.getByRole("radio", { name: /Or 14 carats/i })).toHaveFocus();
	});

	it("moves focus with ArrowLeft wrapping around", async () => {
		render(
			<ColorPicker value="#FFFFFF">
				<ColorPickerPalette />
			</ColorPicker>,
		);
		const first = screen.getByRole("radio", { name: /Or 18 carats/i });
		first.focus();
		await userEvent.keyboard("{ArrowLeft}");
		expect(screen.getByRole("radio", { name: /Saphir/i })).toHaveFocus();
	});

	it("moves focus with Home to first and End to last", async () => {
		render(
			<ColorPicker value="#FFFFFF">
				<ColorPickerPalette />
			</ColorPicker>,
		);
		const first = screen.getByRole("radio", { name: /Or 18 carats/i });
		first.focus();
		await userEvent.keyboard("{End}");
		expect(screen.getByRole("radio", { name: /Saphir/i })).toHaveFocus();
		await userEvent.keyboard("{Home}");
		expect(screen.getByRole("radio", { name: /Or 18 carats/i })).toHaveFocus();
	});

	it("first swatch gets tabIndex=0 when no color matches the palette", () => {
		render(
			<ColorPicker value="#123456">
				<ColorPickerPalette />
			</ColorPicker>,
		);
		const first = screen.getByRole("radio", { name: /Or 18 carats/i });
		expect(first).toHaveAttribute("tabindex", "0");
	});

	it("selected swatch gets tabIndex=0 when it matches a palette color", () => {
		render(
			<ColorPicker value="#D4AF37">
				<ColorPickerPalette />
			</ColorPicker>,
		);
		const selected = screen.getByRole("radio", { name: /Or 18 carats/i });
		expect(selected).toHaveAttribute("tabindex", "0");
		const other = screen.getByRole("radio", { name: /Rubis/i });
		expect(other).toHaveAttribute("tabindex", "-1");
	});
});
