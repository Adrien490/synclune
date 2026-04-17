import { act, cleanup, render, renderHook, screen } from "@testing-library/react";
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

	it("renders a div with role=group", () => {
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

	it("uses defaultValue when value is undefined", () => {
		render(
			<ColorPicker defaultValue="#00ff00">
				<ConsumerComponent />
			</ColorPicker>,
		);
		const hue = Number(screen.getByTestId("hue").textContent);
		expect(hue).toBeGreaterThanOrEqual(100);
		expect(hue).toBeLessThanOrEqual(140);
	});

	it("provides context setters (hue/saturation/lightness/setFromHex) without throwing", () => {
		const wrapper = ({ children }: { children: ReactNode }) => (
			<ColorPicker value="#ff0000">{children}</ColorPicker>
		);

		const { result } = renderHook(() => useColorPicker(), { wrapper });

		expect(() => {
			act(() => {
				result.current.setHue(180);
				result.current.setSaturation(50);
				result.current.setLightness(60);
				result.current.setFromHex("#00FFFF");
			});
		}).not.toThrow();
	});

	it("emits normalized hex via onChange when state mutates", () => {
		const onChange = vi.fn();
		const wrapper = ({ children }: { children: ReactNode }) => (
			<ColorPicker value="#FF0000" onChange={onChange}>
				{children}
			</ColorPicker>
		);
		const { result } = renderHook(() => useColorPicker(), { wrapper });
		onChange.mockClear();

		act(() => {
			result.current.setFromHex("#00ff00");
		});

		expect(onChange).toHaveBeenCalled();
		const [arg] = onChange.mock.calls[onChange.mock.calls.length - 1]!;
		expect(arg).toBe("#00FF00");
	});

	it("does not re-emit onChange when value prop changes (sync only)", () => {
		const onChange = vi.fn();
		const { rerender } = render(
			<ColorPicker value="#FF0000" onChange={onChange}>
				<ConsumerComponent />
			</ColorPicker>,
		);
		onChange.mockClear();

		rerender(
			<ColorPicker value="#00FF00" onChange={onChange}>
				<ConsumerComponent />
			</ColorPicker>,
		);

		expect(onChange).not.toHaveBeenCalled();
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
