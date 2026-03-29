import { cleanup, render, renderHook, screen } from "@testing-library/react";
import { type ReactNode } from "react";
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
// IMPORTS AFTER MOCKS
// ============================================================================

import { ColorPicker, useColorPicker } from "../color-picker";

// ============================================================================
// HELPERS
// ============================================================================

function ConsumerComponent() {
	const ctx = useColorPicker();
	return (
		<div>
			<span data-testid="hue">{ctx.hue}</span>
			<span data-testid="saturation">{ctx.saturation}</span>
			<span data-testid="lightness">{ctx.lightness}</span>
			<span data-testid="alpha">{ctx.alpha}</span>
			<span data-testid="mode">{ctx.mode}</span>
		</div>
	);
}

// ============================================================================
// TESTS
// ============================================================================

afterEach(cleanup);

describe("ColorPicker", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders a div with data-slot=color-picker", () => {
		render(
			<ColorPicker value="#ff0000">
				<div />
			</ColorPicker>,
		);
		expect(screen.getByRole("group")).toBeInTheDocument();
	});

	it("has aria-label 'Sélecteur de couleur'", () => {
		render(
			<ColorPicker value="#ff0000">
				<div />
			</ColorPicker>,
		);
		expect(screen.getByRole("group")).toHaveAttribute("aria-label", "Sélecteur de couleur");
	});

	it("has data-slot=color-picker attribute", () => {
		render(
			<ColorPicker value="#ff0000">
				<div />
			</ColorPicker>,
		);
		expect(screen.getByRole("group")).toHaveAttribute("data-slot", "color-picker");
	});

	it("passes className to the wrapper div", () => {
		render(
			<ColorPicker value="#ff0000" className="my-custom-class">
				<div />
			</ColorPicker>,
		);
		const group = screen.getByRole("group");
		expect(group.className).toContain("my-custom-class");
	});

	it("renders children inside the provider", () => {
		render(
			<ColorPicker value="#ff0000">
				<span data-testid="child">child</span>
			</ColorPicker>,
		);
		expect(screen.getByTestId("child")).toBeInTheDocument();
	});

	it("provides initial mode=hex via context", () => {
		render(
			<ColorPicker value="#ff0000">
				<ConsumerComponent />
			</ColorPicker>,
		);
		expect(screen.getByTestId("mode").textContent).toBe("hex");
	});

	it("uses defaultValue when value is undefined", () => {
		render(
			<ColorPicker defaultValue="#00ff00">
				<ConsumerComponent />
			</ColorPicker>,
		);
		// green hue ~120
		const hue = Number(screen.getByTestId("hue").textContent);
		expect(hue).toBeGreaterThanOrEqual(100);
		expect(hue).toBeLessThanOrEqual(140);
	});

	it("extracts alpha from value", () => {
		render(
			<ColorPicker value="rgba(255,0,0,0.5)">
				<ConsumerComponent />
			</ColorPicker>,
		);
		const alpha = Number(screen.getByTestId("alpha").textContent);
		// 0.5 * 100 = 50
		expect(alpha).toBeCloseTo(50, 0);
	});

	it("provides context setters without throwing", () => {
		const wrapper = ({ children }: { children: ReactNode }) => (
			<ColorPicker value="#ff0000">{children}</ColorPicker>
		);

		const { result } = renderHook(() => useColorPicker(), { wrapper });

		expect(() => {
			result.current.setHue(180);
			result.current.setSaturation(50);
			result.current.setLightness(60);
			result.current.setAlpha(80);
			result.current.setMode("rgb");
		}).not.toThrow();
	});
});

describe("useColorPicker outside provider", () => {
	it("throws when used outside ColorPickerProvider", () => {
		function BrokenComponent() {
			useColorPicker();
			return null;
		}

		const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

		expect(() => render(<BrokenComponent />)).toThrow(
			"useColorPicker must be used within a ColorPickerProvider",
		);

		consoleError.mockRestore();
	});
});
