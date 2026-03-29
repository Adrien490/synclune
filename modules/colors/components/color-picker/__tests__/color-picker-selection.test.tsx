import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockSetSaturation, mockSetLightness, mockUseColorPicker } = vi.hoisted(() => ({
	mockSetSaturation: vi.fn(),
	mockSetLightness: vi.fn(),
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

// ============================================================================
// IMPORTS AFTER MOCKS
// ============================================================================

import { ColorPickerSelection } from "../color-picker-selection";

// ============================================================================
// HELPERS
// ============================================================================

function setupMockContext(overrides: Record<string, unknown> = {}) {
	mockUseColorPicker.mockReturnValue({
		hue: 0,
		saturation: 100,
		lightness: 50,
		alpha: 100,
		mode: "hex",
		setHue: vi.fn(),
		setSaturation: mockSetSaturation,
		setLightness: mockSetLightness,
		setAlpha: vi.fn(),
		setMode: vi.fn(),
		...overrides,
	});
}

// ============================================================================
// TESTS
// ============================================================================

afterEach(cleanup);

describe("ColorPickerSelection", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupMockContext();
	});

	it("renders with role=slider", () => {
		render(<ColorPickerSelection />);
		expect(screen.getByRole("slider")).toBeInTheDocument();
	});

	it("has aria-label 'Sélecteur de couleur'", () => {
		render(<ColorPickerSelection />);
		expect(screen.getByRole("slider")).toHaveAttribute("aria-label", "Sélecteur de couleur");
	});

	it("has data-slot=color-picker-selection", () => {
		render(<ColorPickerSelection />);
		expect(screen.getByRole("slider")).toHaveAttribute("data-slot", "color-picker-selection");
	});

	it("reflects aria-valuenow from saturation context", () => {
		setupMockContext({ saturation: 75 });
		render(<ColorPickerSelection />);
		expect(screen.getByRole("slider")).toHaveAttribute("aria-valuenow", "75");
	});

	it("has aria-valuemin=0 and aria-valuemax=100", () => {
		render(<ColorPickerSelection />);
		const slider = screen.getByRole("slider");
		expect(slider).toHaveAttribute("aria-valuemin", "0");
		expect(slider).toHaveAttribute("aria-valuemax", "100");
	});

	it("includes aria-valuetext with saturation and luminosité", () => {
		setupMockContext({ saturation: 60, lightness: 40 });
		render(<ColorPickerSelection />);
		const slider = screen.getByRole("slider");
		expect(slider.getAttribute("aria-valuetext")).toContain("Saturation 60%");
		expect(slider.getAttribute("aria-valuetext")).toContain("Luminosité 40%");
	});

	it("has tabIndex=0", () => {
		render(<ColorPickerSelection />);
		expect(screen.getByRole("slider")).toHaveAttribute("tabindex", "0");
	});

	it("renders the sr-only description text", () => {
		render(<ColorPickerSelection />);
		expect(screen.getByText(/Utilisez les flèches pour ajuster/i)).toBeInTheDocument();
	});

	it("passes className to the slider element", () => {
		render(<ColorPickerSelection className="custom-class" />);
		expect(screen.getByRole("slider").className).toContain("custom-class");
	});

	it("handles ArrowRight key to increase saturation", async () => {
		setupMockContext({ saturation: 50, lightness: 50 });
		render(<ColorPickerSelection />);
		const slider = screen.getByRole("slider");
		slider.focus();
		await userEvent.keyboard("{ArrowRight}");
		expect(mockSetSaturation).toHaveBeenCalled();
	});

	it("handles ArrowLeft key to decrease saturation", async () => {
		setupMockContext({ saturation: 50, lightness: 50 });
		render(<ColorPickerSelection />);
		const slider = screen.getByRole("slider");
		slider.focus();
		await userEvent.keyboard("{ArrowLeft}");
		expect(mockSetSaturation).toHaveBeenCalled();
	});
});
