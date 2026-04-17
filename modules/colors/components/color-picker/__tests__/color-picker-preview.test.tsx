import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/shared/components/copy-button", () => ({
	CopyButton: ({ text, label }: { text: string; label: string }) => (
		<button type="button" aria-label={`Copier ${label.toLowerCase()}`}>
			{text}
		</button>
	),
}));

// ============================================================================
// IMPORTS
// ============================================================================

import { ColorPicker } from "../color-picker";
import { ColorPickerPreview } from "../color-picker-preview";

// ============================================================================
// TESTS
// ============================================================================

afterEach(cleanup);

describe("ColorPickerPreview", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders the current hex as img with label", () => {
		render(
			<ColorPicker value="#FF0000">
				<ColorPickerPreview />
			</ColorPicker>,
		);
		expect(screen.getByRole("img", { name: /#FF0000/i })).toBeInTheDocument();
	});

	it("applies the hex as background color", () => {
		render(
			<ColorPicker value="#00FF00">
				<ColorPickerPreview />
			</ColorPicker>,
		);
		const preview = screen.getByRole("img");
		const bg = (preview as HTMLElement).style.backgroundColor;
		expect(bg.replace(/\s/g, "").toLowerCase()).toMatch(/rgb\(0,255,0\)|#00ff00/);
	});

	it("renders a copy button with the hex value", () => {
		render(
			<ColorPicker value="#112233">
				<ColorPickerPreview />
			</ColorPicker>,
		);
		const copyButton = screen.getByRole("button", { name: /Copier code couleur/i });
		expect(copyButton).toHaveTextContent("#112233");
	});

	it("exposes an aria-live region with the current hex", () => {
		const { container } = render(
			<ColorPicker value="#ABCDEF">
				<ColorPickerPreview />
			</ColorPicker>,
		);
		const live = container.querySelector('[aria-live="polite"]');
		expect(live).toHaveTextContent(/#ABCDEF/i);
	});

	it("uses dark text on light background (e.g. #FFFFFF)", () => {
		const { container } = render(
			<ColorPicker value="#FFFFFF">
				<ColorPickerPreview />
			</ColorPicker>,
		);
		const label = container.querySelector('[data-slot="color-picker-preview"] span[aria-hidden]');
		expect(label?.className).toContain("text-neutral-900");
	});

	it("uses light text on dark background (e.g. #000000)", () => {
		const { container } = render(
			<ColorPicker value="#000000">
				<ColorPickerPreview />
			</ColorPicker>,
		);
		const label = container.querySelector('[data-slot="color-picker-preview"] span[aria-hidden]');
		expect(label?.className).toContain("text-white");
	});

	it("has data-slot=color-picker-preview", () => {
		render(
			<ColorPicker value="#FF0000">
				<ColorPickerPreview />
			</ColorPicker>,
		);
		expect(screen.getByRole("img")).toHaveAttribute("data-slot", "color-picker-preview");
	});
});
