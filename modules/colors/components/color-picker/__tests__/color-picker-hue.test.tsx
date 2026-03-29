import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockSetHue, mockUseColorPicker } = vi.hoisted(() => ({
	mockSetHue: vi.fn(),
	mockUseColorPicker: vi.fn(),
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

vi.mock("../color-picker", () => ({
	useColorPicker: mockUseColorPicker,
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@radix-ui/react-slider", () => ({
	Root: ({
		children,
		"aria-label": ariaLabel,
		value,
		max,
		onValueChange: _onValueChange,
		...props
	}: {
		children?: React.ReactNode;
		"aria-label"?: string;
		value?: number[];
		max?: number;
		onValueChange?: (value: number[]) => void;
		[key: string]: unknown;
	}) => (
		<div
			role="slider"
			aria-label={ariaLabel}
			aria-valuenow={value?.[0]}
			aria-valuemax={max}
			{...props}
		>
			{children}
		</div>
	),
	Track: ({ children }: { children?: React.ReactNode }) => (
		<div data-testid="slider-track">{children}</div>
	),
	Range: () => <div data-testid="slider-range" />,
	Thumb: () => <div data-testid="slider-thumb" />,
}));

// ============================================================================
// IMPORTS AFTER MOCKS
// ============================================================================

import { ColorPickerHue } from "../color-picker-hue";

// ============================================================================
// HELPERS
// ============================================================================

function setupContext(hue = 0) {
	mockUseColorPicker.mockReturnValue({
		hue,
		saturation: 100,
		lightness: 50,
		alpha: 100,
		mode: "hex",
		setHue: mockSetHue,
		setSaturation: vi.fn(),
		setLightness: vi.fn(),
		setAlpha: vi.fn(),
		setMode: vi.fn(),
	});
}

// ============================================================================
// TESTS
// ============================================================================

afterEach(cleanup);

describe("ColorPickerHue", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupContext();
	});

	it("renders with role=slider", () => {
		render(<ColorPickerHue />);
		expect(screen.getByRole("slider")).toBeInTheDocument();
	});

	it("has aria-label 'Teinte'", () => {
		render(<ColorPickerHue />);
		expect(screen.getByRole("slider")).toHaveAttribute("aria-label", "Teinte");
	});

	it("has data-slot=color-picker-hue", () => {
		render(<ColorPickerHue />);
		expect(screen.getByRole("slider")).toHaveAttribute("data-slot", "color-picker-hue");
	});

	it("reflects hue value from context as aria-valuenow", () => {
		setupContext(180);
		render(<ColorPickerHue />);
		expect(screen.getByRole("slider")).toHaveAttribute("aria-valuenow", "180");
	});

	it("has aria-valuemax=360", () => {
		render(<ColorPickerHue />);
		expect(screen.getByRole("slider")).toHaveAttribute("aria-valuemax", "360");
	});

	it("renders slider track and thumb", () => {
		render(<ColorPickerHue />);
		expect(screen.getByTestId("slider-track")).toBeInTheDocument();
		expect(screen.getByTestId("slider-thumb")).toBeInTheDocument();
	});
});
