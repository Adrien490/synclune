import { cleanup, render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockHaptic } = vi.hoisted(() => ({ mockHaptic: vi.fn() }));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => mockHaptic,
}));

// ============================================================================
// IMPORTS
// ============================================================================

import { ColorPalette } from "../color-palette";
import { JEWELRY_PALETTE } from "../../constants/jewelry-palette";

// ============================================================================
// TESTS
// ============================================================================

afterEach(cleanup);

describe("ColorPalette", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders all 12 jewelry swatches", () => {
		render(<ColorPalette value="#FFFFFF" />);
		const group = screen.getByRole("radiogroup");
		const swatches = within(group).getAllByRole("radio");
		expect(swatches).toHaveLength(JEWELRY_PALETTE.length);
		expect(swatches).toHaveLength(12);
	});

	it("exposes each swatch with aria-label and hex", () => {
		render(<ColorPalette value="#FFFFFF" />);
		expect(screen.getByRole("radio", { name: /Or 18 carats.*#D4AF37/i })).toBeInTheDocument();
		expect(screen.getByRole("radio", { name: /Argent 925.*#C0C0C0/i })).toBeInTheDocument();
	});

	it("marks the matching swatch aria-checked=true", () => {
		render(<ColorPalette value="#D4AF37" />);
		const or18 = screen.getByRole("radio", { name: /Or 18 carats/i });
		expect(or18).toHaveAttribute("aria-checked", "true");
	});

	it("marks the matching swatch aria-checked=true with non-normalized hex input", () => {
		render(<ColorPalette value="#d4af37" />);
		const or18 = screen.getByRole("radio", { name: /Or 18 carats/i });
		expect(or18).toHaveAttribute("aria-checked", "true");
	});

	it("marks non-matching swatches aria-checked=false", () => {
		render(<ColorPalette value="#FFFFFF" />);
		const or18 = screen.getByRole("radio", { name: /Or 18 carats/i });
		expect(or18).toHaveAttribute("aria-checked", "false");
	});

	it("calls onChange with the normalized hex on click", async () => {
		const onChange = vi.fn();
		render(<ColorPalette value="#FFFFFF" onChange={onChange} />);
		await userEvent.click(screen.getByRole("radio", { name: /Or 18 carats/i }));
		expect(onChange).toHaveBeenCalledWith("#D4AF37");
	});

	it("triggers selection haptic on click", async () => {
		const onChange = vi.fn();
		render(<ColorPalette value="#FFFFFF" onChange={onChange} />);
		await userEvent.click(screen.getByRole("radio", { name: /Or 18 carats/i }));
		expect(mockHaptic).toHaveBeenCalledWith("selection");
	});

	it("calls onChange when pressing Enter on a focused swatch", async () => {
		const onChange = vi.fn();
		render(<ColorPalette value="#FFFFFF" onChange={onChange} />);
		const rubis = screen.getByRole("radio", { name: /Rubis/i });
		rubis.focus();
		await userEvent.keyboard("{Enter}");
		expect(onChange).toHaveBeenCalledWith("#9B111E");
	});

	it("calls onChange when pressing Space on a focused swatch", async () => {
		const onChange = vi.fn();
		render(<ColorPalette value="#FFFFFF" onChange={onChange} />);
		const saphir = screen.getByRole("radio", { name: /Saphir/i });
		saphir.focus();
		await userEvent.keyboard(" ");
		expect(onChange).toHaveBeenCalledWith("#0F52BA");
	});

	it("moves focus with ArrowRight (roving tabindex)", async () => {
		render(<ColorPalette value="#FFFFFF" />);
		const first = screen.getByRole("radio", { name: /Or 18 carats/i });
		first.focus();
		await userEvent.keyboard("{ArrowRight}");
		expect(screen.getByRole("radio", { name: /Or 14 carats/i })).toHaveFocus();
	});

	it("moves focus with ArrowLeft wrapping around", async () => {
		render(<ColorPalette value="#FFFFFF" />);
		const first = screen.getByRole("radio", { name: /Or 18 carats/i });
		first.focus();
		await userEvent.keyboard("{ArrowLeft}");
		expect(screen.getByRole("radio", { name: /Saphir/i })).toHaveFocus();
	});

	it("moves focus with Home to first and End to last", async () => {
		render(<ColorPalette value="#FFFFFF" />);
		const first = screen.getByRole("radio", { name: /Or 18 carats/i });
		first.focus();
		await userEvent.keyboard("{End}");
		expect(screen.getByRole("radio", { name: /Saphir/i })).toHaveFocus();
		await userEvent.keyboard("{Home}");
		expect(screen.getByRole("radio", { name: /Or 18 carats/i })).toHaveFocus();
	});

	it("first swatch gets tabIndex=0 when no color matches the palette", () => {
		render(<ColorPalette value="#123456" />);
		const first = screen.getByRole("radio", { name: /Or 18 carats/i });
		expect(first).toHaveAttribute("tabindex", "0");
	});

	it("selected swatch gets tabIndex=0 when it matches a palette color", () => {
		render(<ColorPalette value="#D4AF37" />);
		const selected = screen.getByRole("radio", { name: /Or 18 carats/i });
		expect(selected).toHaveAttribute("tabindex", "0");
		const other = screen.getByRole("radio", { name: /Rubis/i });
		expect(other).toHaveAttribute("tabindex", "-1");
	});

	it("first swatch gets tabIndex=0 when value is undefined", () => {
		render(<ColorPalette />);
		const first = screen.getByRole("radio", { name: /Or 18 carats/i });
		expect(first).toHaveAttribute("tabindex", "0");
	});

	it("does not call onChange or haptic when disabled", async () => {
		const onChange = vi.fn();
		render(<ColorPalette value="#FFFFFF" onChange={onChange} disabled />);
		const swatch = screen.getByRole("radio", { name: /Or 18 carats/i });
		expect(swatch).toBeDisabled();
		await userEvent.click(swatch);
		expect(onChange).not.toHaveBeenCalled();
		expect(mockHaptic).not.toHaveBeenCalled();
	});

	it("renders the palette label", () => {
		render(<ColorPalette value="#FFFFFF" />);
		expect(screen.getByText("Palette bijoux")).toBeInTheDocument();
	});

	it("accepts a custom colors list", () => {
		const customColors = [
			{ name: "Test Red", hex: "#FF0000" as const },
			{ name: "Test Blue", hex: "#0000FF" as const },
		];
		render(<ColorPalette value="#FF0000" colors={customColors} />);
		const swatches = screen.getAllByRole("radio");
		expect(swatches).toHaveLength(2);
		expect(screen.getByRole("radio", { name: /Test Red/i })).toBeInTheDocument();
	});
});
