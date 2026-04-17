import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockSetHue, mockSetSaturation, mockSetLightness, mockSetFromHex, mockUseColorPicker } =
	vi.hoisted(() => ({
		mockSetHue: vi.fn(),
		mockSetSaturation: vi.fn(),
		mockSetLightness: vi.fn(),
		mockSetFromHex: vi.fn(),
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
		disabled,
		"aria-label": ariaLabel,
		...props
	}: {
		children: React.ReactNode;
		onClick?: () => void;
		disabled?: boolean;
		"aria-label"?: string;
		[key: string]: unknown;
	}) => (
		<button onClick={onClick} disabled={disabled} aria-label={ariaLabel} {...props}>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/ui/tooltip", () => ({
	Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	TooltipTrigger: ({ children }: { children: React.ReactNode; asChild?: boolean }) => (
		<>{children}</>
	),
	TooltipContent: ({ children }: { children: React.ReactNode }) => (
		<span data-testid="tooltip-content">{children}</span>
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
		setHue: mockSetHue,
		setSaturation: mockSetSaturation,
		setLightness: mockSetLightness,
		setFromHex: mockSetFromHex,
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
		it("renders a disabled button with tooltip explaining unavailability", () => {
			render(<ColorPickerEyeDropper />);
			const btn = screen.getByRole("button", { name: /Pipette non disponible/i });
			expect(btn).toBeInTheDocument();
			expect(btn).toBeDisabled();
			expect(screen.getByTestId("tooltip-content")).toHaveTextContent(/Pipette non disponible/);
		});
	});

	describe("when EyeDropper API IS supported", () => {
		beforeEach(() => {
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
			expect(screen.getByRole("button", { name: /Pipette - sélectionner/i })).toBeInTheDocument();
		});

		it("has data-slot=color-picker-eye-dropper", () => {
			render(<ColorPickerEyeDropper />);
			expect(screen.getByRole("button", { name: /Pipette/i })).toHaveAttribute(
				"data-slot",
				"color-picker-eye-dropper",
			);
		});

		it("calls setHue, setSaturation, setLightness on click (no setAlpha)", async () => {
			render(<ColorPickerEyeDropper />);
			await userEvent.click(screen.getByRole("button", { name: /Pipette/i }));
			expect(mockSetHue).toHaveBeenCalled();
			expect(mockSetSaturation).toHaveBeenCalled();
			expect(mockSetLightness).toHaveBeenCalled();
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
