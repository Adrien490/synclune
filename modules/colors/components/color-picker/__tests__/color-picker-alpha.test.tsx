import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockSetAlpha, mockUseColorPicker } = vi.hoisted(() => ({
	mockSetAlpha: vi.fn(),
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

import { ColorPickerAlpha } from "../color-picker-alpha";

// ============================================================================
// HELPERS
// ============================================================================

function setupContext(alpha = 100) {
	mockUseColorPicker.mockReturnValue({
		hue: 0,
		saturation: 100,
		lightness: 50,
		alpha,
		mode: "hex",
		setHue: vi.fn(),
		setSaturation: vi.fn(),
		setLightness: vi.fn(),
		setAlpha: mockSetAlpha,
		setMode: vi.fn(),
	});
}

// ============================================================================
// TESTS
// ============================================================================

afterEach(cleanup);

describe("ColorPickerAlpha", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupContext();
	});

	it("renders with role=slider", () => {
		render(<ColorPickerAlpha />);
		expect(screen.getByRole("slider")).toBeInTheDocument();
	});

	it("has aria-label 'Opacité'", () => {
		render(<ColorPickerAlpha />);
		expect(screen.getByRole("slider")).toHaveAttribute("aria-label", "Opacité");
	});

	it("has data-slot=color-picker-alpha", () => {
		render(<ColorPickerAlpha />);
		expect(screen.getByRole("slider")).toHaveAttribute("data-slot", "color-picker-alpha");
	});

	it("reflects alpha value from context as aria-valuenow", () => {
		setupContext(75);
		render(<ColorPickerAlpha />);
		expect(screen.getByRole("slider")).toHaveAttribute("aria-valuenow", "75");
	});

	it("has aria-valuemax=100", () => {
		render(<ColorPickerAlpha />);
		expect(screen.getByRole("slider")).toHaveAttribute("aria-valuemax", "100");
	});

	it("renders slider track and thumb", () => {
		render(<ColorPickerAlpha />);
		expect(screen.getByTestId("slider-track")).toBeInTheDocument();
		expect(screen.getByTestId("slider-thumb")).toBeInTheDocument();
	});
});
