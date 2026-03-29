import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockSetHue, mockSetSaturation, mockSetLightness, mockSetAlpha, mockUseColorPicker } =
	vi.hoisted(() => ({
		mockSetHue: vi.fn(),
		mockSetSaturation: vi.fn(),
		mockSetLightness: vi.fn(),
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

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		onClick,
		"aria-label": ariaLabel,
		...props
	}: {
		children: React.ReactNode;
		onClick?: () => void;
		"aria-label"?: string;
		[key: string]: unknown;
	}) => (
		<button onClick={onClick} aria-label={ariaLabel} {...props}>
			{children}
		</button>
	),
}));

// ============================================================================
// IMPORTS AFTER MOCKS
// ============================================================================

import { ColorPickerEyeDropper } from "../color-picker-eye-dropper";

// ============================================================================
// HELPERS
// ============================================================================

function setupContext() {
	mockUseColorPicker.mockReturnValue({
		hue: 0,
		saturation: 100,
		lightness: 50,
		alpha: 100,
		mode: "hex",
		setHue: mockSetHue,
		setSaturation: mockSetSaturation,
		setLightness: mockSetLightness,
		setAlpha: mockSetAlpha,
		setMode: vi.fn(),
	});
}

// ============================================================================
// TESTS
// ============================================================================

afterEach(cleanup);

describe("ColorPickerEyeDropper", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupContext();
	});

	describe("when EyeDropper API is NOT supported", () => {
		it("renders nothing when EyeDropper is not in window", () => {
			// EyeDropper is not defined in jsdom by default
			const { container } = render(<ColorPickerEyeDropper />);
			expect(container.firstChild).toBeNull();
		});
	});

	describe("when EyeDropper API IS supported", () => {
		beforeEach(() => {
			// Polyfill EyeDropper on window
			(window as unknown as Record<string, unknown>).EyeDropper = class MockEyeDropper {
				async open() {
					return { sRGBHex: "#ff0000" };
				}
			};
		});

		afterEach(() => {
			delete (window as unknown as Record<string, unknown>).EyeDropper;
		});

		it("renders the eye dropper button", () => {
			render(<ColorPickerEyeDropper />);
			expect(screen.getByRole("button", { name: /Pipette/i })).toBeInTheDocument();
		});

		it("has data-slot=color-picker-eye-dropper", () => {
			render(<ColorPickerEyeDropper />);
			expect(screen.getByRole("button", { name: /Pipette/i })).toHaveAttribute(
				"data-slot",
				"color-picker-eye-dropper",
			);
		});

		it("calls setHue, setSaturation, setLightness, setAlpha on click", async () => {
			render(<ColorPickerEyeDropper />);
			await userEvent.click(screen.getByRole("button", { name: /Pipette/i }));
			expect(mockSetHue).toHaveBeenCalled();
			expect(mockSetSaturation).toHaveBeenCalled();
			expect(mockSetLightness).toHaveBeenCalled();
			expect(mockSetAlpha).toHaveBeenCalledWith(100);
		});

		it("handles EyeDropper cancellation gracefully", async () => {
			(window as unknown as Record<string, unknown>).EyeDropper = class MockEyeDropper {
				async open() {
					throw new Error("User cancelled");
				}
			};
			render(<ColorPickerEyeDropper />);
			await expect(
				userEvent.click(screen.getByRole("button", { name: /Pipette/i })),
			).resolves.not.toThrow();
			expect(mockSetHue).not.toHaveBeenCalled();
		});
	});
});
