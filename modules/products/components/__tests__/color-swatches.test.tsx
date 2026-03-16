import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ColorSwatch } from "@/modules/products/types/product-list.types";

// ─── Module mocks ─────────────────────────────────────────────────────────────

// Stub AriaColorSwatch — display a plain div with role img
vi.mock("@/modules/products/components/aria-color-swatch", () => ({
	ColorSwatch: ({
		colorName,
		color,
		className,
	}: {
		color: string;
		colorName: string;
		className?: string;
	}) => (
		<div role="img" aria-label={colorName} style={{ background: color }} className={className} />
	),
}));

// Stub Tooltip primitives — just render children transparently
vi.mock("@/shared/components/ui/tooltip", () => ({
	Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	TooltipTrigger: ({
		children,
		asChild: _asChild,
	}: {
		children: React.ReactNode;
		asChild?: boolean;
	}) => <>{children}</>,
	TooltipContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="tooltip-content">{children}</div>
	),
}));

// Stub Popover primitives — render children, expose open state via data-attr
vi.mock("@/shared/components/ui/popover", () => ({
	Popover: ({
		children,
		open,
	}: {
		children: React.ReactNode;
		open?: boolean;
		onOpenChange?: (v: boolean) => void;
	}) => <div data-popover-open={open}>{children}</div>,
	PopoverTrigger: ({
		children,
		asChild: _asChild,
	}: {
		children: React.ReactNode;
		asChild?: boolean;
	}) => <>{children}</>,
	PopoverContent: ({ children }: { children: React.ReactNode; [key: string]: unknown }) => (
		<div data-testid="popover-content">{children}</div>
	),
}));

// Stub isLightColor — always return false to keep class assertions simple
vi.mock("@/modules/colors/utils/color-contrast.utils", () => ({
	isLightColor: () => false,
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

// useIsTouchDevice → false (desktop by default, avoids Tooltip vs. title branching)
vi.mock("@/shared/hooks", () => ({
	useIsTouchDevice: () => false,
}));

import { ColorSwatches } from "../color-swatches";

afterEach(cleanup);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeColor(overrides: Partial<ColorSwatch> = {}): ColorSwatch {
	return {
		slug: "argent",
		hex: "#C0C0C0",
		name: "Argent",
		inStock: true,
		...overrides,
	};
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("ColorSwatches", () => {
	it("returns null and renders nothing when colors array is empty", () => {
		const { container } = render(<ColorSwatches colors={[]} />);

		expect(container.firstChild).toBeNull();
	});

	it("renders a swatch for each color provided", () => {
		const colors = [
			makeColor({ slug: "argent", name: "Argent" }),
			makeColor({ slug: "or", hex: "#FFD700", name: "Or" }),
		];

		render(<ColorSwatches colors={colors} />);

		expect(screen.getByRole("img", { name: "Argent" })).toBeInTheDocument();
		expect(screen.getByRole("img", { name: "Or" })).toBeInTheDocument();
	});

	it("shows a +N overflow button when visible colors exceed maxVisible", () => {
		const colors = Array.from({ length: 6 }, (_, i) =>
			makeColor({ slug: `col-${i}`, name: `Couleur ${i}` }),
		);

		render(<ColorSwatches colors={colors} maxVisible={4} />);

		// 6 total, 4 visible → +2 overflow button
		expect(screen.getByRole("button", { name: /Voir 2 autres couleurs/i })).toBeInTheDocument();
	});

	describe("interactive mode", () => {
		it("calls onColorSelect with the color slug when a swatch is clicked", () => {
			const onColorSelect = vi.fn();
			const colors = [makeColor({ slug: "argent", name: "Argent" })];

			render(
				<ColorSwatches
					colors={colors}
					interactive
					onColorSelect={onColorSelect}
					selectedColor={null}
				/>,
			);

			const btn = screen.getByRole("button", { name: /Argent/i });
			fireEvent.click(btn);

			expect(onColorSelect).toHaveBeenCalledOnce();
			expect(onColorSelect).toHaveBeenCalledWith("argent");
		});

		it("marks the selected swatch with aria-pressed=true", () => {
			const colors = [
				makeColor({ slug: "argent", name: "Argent" }),
				makeColor({ slug: "or", hex: "#FFD700", name: "Or" }),
			];

			render(
				<ColorSwatches
					colors={colors}
					interactive
					selectedColor="argent"
					onColorSelect={vi.fn()}
				/>,
			);

			const argentBtn = screen.getByRole("button", { name: /Argent \(sélectionnée\)/i });
			expect(argentBtn).toHaveAttribute("aria-pressed", "true");

			const orBtn = screen.getByRole("button", { name: /^Or$/i });
			expect(orBtn).toHaveAttribute("aria-pressed", "false");
		});

		it("disables the swatch and prevents selection when the color is out of stock", () => {
			const onColorSelect = vi.fn();
			const colors = [makeColor({ slug: "noir", name: "Noir", inStock: false })];

			render(
				<ColorSwatches
					colors={colors}
					interactive
					onColorSelect={onColorSelect}
					selectedColor={null}
				/>,
			);

			const btn = screen.getByRole("button", { name: /Noir \(rupture\)/i });
			expect(btn).toBeDisabled();

			fireEvent.click(btn);
			expect(onColorSelect).not.toHaveBeenCalled();
		});

		it("disables all swatches when the disabled prop is true", () => {
			const colors = [
				makeColor({ slug: "argent", name: "Argent" }),
				makeColor({ slug: "or", hex: "#FFD700", name: "Or" }),
			];

			render(
				<ColorSwatches
					colors={colors}
					interactive
					disabled
					selectedColor={null}
					onColorSelect={vi.fn()}
				/>,
			);

			const buttons = screen.getAllByRole("button");
			for (const btn of buttons) {
				expect(btn).toBeDisabled();
			}
		});
	});

	describe("decorative mode (default)", () => {
		it("renders swatches as non-interactive spans, not buttons", () => {
			const colors = [makeColor({ slug: "argent", name: "Argent" })];

			render(<ColorSwatches colors={colors} />);

			// In decorative mode there should be no buttons for individual swatches
			expect(screen.queryByRole("button")).not.toBeInTheDocument();
		});

		it("shows an out-of-stock strikethrough overlay for unavailable colors", () => {
			const colors = [makeColor({ slug: "blanc", name: "Blanc", inStock: false })];

			const { container } = render(<ColorSwatches colors={colors} />);

			// The strikethrough line span is aria-hidden; confirm its parent is present
			const strikeLines = container.querySelectorAll('[aria-hidden="true"]');
			expect(strikeLines.length).toBeGreaterThan(0);
		});
	});

	it("includes an accessible label on the wrapper listing the colour count", () => {
		const colors = [makeColor({ slug: "argent", name: "Argent" })];

		render(<ColorSwatches colors={colors} />);

		const wrapper = screen.getByRole("generic", {
			name: /1 couleur disponible/i,
		});
		expect(wrapper).toBeInTheDocument();
	});
});
