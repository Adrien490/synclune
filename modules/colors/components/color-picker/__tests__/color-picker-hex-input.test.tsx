import { cleanup, render, screen } from "@testing-library/react";
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

vi.mock("@/shared/components/ui/input", () => ({
	Input: ({ ...props }: React.ComponentProps<"input">) => <input {...props} />,
}));

// ============================================================================
// IMPORTS (after mocks)
// ============================================================================

import { ColorPicker } from "../color-picker";
import { ColorPickerHexInput } from "../color-picker-hex-input";

// ============================================================================
// HELPERS
// ============================================================================

function renderWithProvider(initial = "#FF0000", onChange?: (hex: string) => void) {
	return render(
		<ColorPicker value={initial} onChange={onChange}>
			<ColorPickerHexInput />
		</ColorPicker>,
	);
}

// ============================================================================
// TESTS
// ============================================================================

afterEach(cleanup);

describe("ColorPickerHexInput", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders an editable input seeded from context hex", () => {
		renderWithProvider("#FF0000");
		const input = screen.getByRole("textbox", { name: /Code couleur/i }) as HTMLInputElement;
		expect(input).toBeInTheDocument();
		expect(input.readOnly).toBe(false);
		expect(input.value.toUpperCase()).toBe("#FF0000");
	});

	it("triggers onChange with normalized hex when user types a valid 6-char hex", async () => {
		const onChange = vi.fn();
		renderWithProvider("#FF0000", onChange);
		const input = screen.getByRole("textbox", { name: /Code couleur/i });
		await userEvent.clear(input);
		await userEvent.type(input, "#00FF00");
		expect(onChange).toHaveBeenCalledWith("#00FF00");
	});

	it("normalizes pasted #abc → #AABBCC on blur", async () => {
		renderWithProvider("#FF0000");
		const input = screen.getByRole("textbox", { name: /Code couleur/i }) as HTMLInputElement;
		await userEvent.clear(input);
		await userEvent.type(input, "#abc");
		await userEvent.tab();
		expect(input.value).toBe("#AABBCC");
	});

	it("filters non-hex characters during typing", async () => {
		renderWithProvider("#FF0000");
		const input = screen.getByRole("textbox", { name: /Code couleur/i }) as HTMLInputElement;
		await userEvent.clear(input);
		await userEvent.type(input, "#ZZQQPP");
		expect(input.value).toBe("#");
	});

	it("reverts to current context hex on invalid value at blur", async () => {
		renderWithProvider("#FF0000");
		const input = screen.getByRole("textbox", { name: /Code couleur/i }) as HTMLInputElement;
		await userEvent.clear(input);
		await userEvent.type(input, "#FF");
		await userEvent.tab();
		expect(input.value.toUpperCase()).toBe("#FF0000");
	});

	it("shows aria-invalid and error message for invalid length while focused", async () => {
		renderWithProvider("#FF0000");
		const input = screen.getByRole("textbox", { name: /Code couleur/i });
		await userEvent.clear(input);
		await userEvent.type(input, "#FFFF");
		expect(input).toHaveAttribute("aria-invalid", "true");
		expect(screen.getByRole("alert")).toBeInTheDocument();
	});

	it("commits on Enter key", async () => {
		const onChange = vi.fn();
		renderWithProvider("#FF0000", onChange);
		const input = screen.getByRole("textbox", { name: /Code couleur/i }) as HTMLInputElement;
		await userEvent.clear(input);
		await userEvent.type(input, "#1a2b3c{Enter}");
		expect(input.value).toBe("#1A2B3C");
		expect(onChange).toHaveBeenCalledWith("#1A2B3C");
	});

	it("cancels edit on Escape", async () => {
		renderWithProvider("#FF0000");
		const input = screen.getByRole("textbox", { name: /Code couleur/i }) as HTMLInputElement;
		await userEvent.clear(input);
		await userEvent.type(input, "#ZZ{Escape}");
		expect(input.value.toUpperCase()).toBe("#FF0000");
	});

	it("caps input length at 7 chars", async () => {
		renderWithProvider("#FF0000");
		const input = screen.getByRole("textbox", { name: /Code couleur/i }) as HTMLInputElement;
		await userEvent.clear(input);
		await userEvent.type(input, "#AABBCCDD");
		expect(input.value.length).toBeLessThanOrEqual(7);
	});

	it("is disabled when disabled prop is true", () => {
		render(
			<ColorPicker value="#FF0000">
				<ColorPickerHexInput disabled />
			</ColorPicker>,
		);
		const input = screen.getByRole("textbox", { name: /Code couleur/i }) as HTMLInputElement;
		expect(input.disabled).toBe(true);
	});
});
