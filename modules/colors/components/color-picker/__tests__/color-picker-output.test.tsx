import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockSetMode, mockUseColorPicker } = vi.hoisted(() => ({
	mockSetMode: vi.fn(),
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

vi.mock("@/shared/components/ui/select", () => ({
	Select: ({
		children,
		value,
		onValueChange,
	}: {
		children: React.ReactNode;
		value?: string;
		onValueChange?: (value: string) => void;
	}) => (
		<div data-testid="select-root" data-value={value}>
			{/* simulate a native select to test onChange easily */}
			<select
				value={value}
				onChange={(e) => onValueChange?.(e.target.value)}
				aria-label="select-native"
			>
				<option value="hex">HEX</option>
				<option value="rgb">RGB</option>
				<option value="css">CSS</option>
				<option value="hsl">HSL</option>
			</select>
			{children}
		</div>
	),
	SelectTrigger: ({
		children,
		...props
	}: {
		children: React.ReactNode;
		[key: string]: unknown;
	}) => <div {...props}>{children}</div>,
	SelectValue: ({ placeholder }: { placeholder?: string }) => (
		<span data-testid="select-value">{placeholder}</span>
	),
	SelectContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="select-content">{children}</div>
	),
	SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
		<div data-testid={`select-item-${value}`}>{children}</div>
	),
}));

// ============================================================================
// IMPORTS AFTER MOCKS
// ============================================================================

import { ColorPickerOutput } from "../color-picker-output";

// ============================================================================
// HELPERS
// ============================================================================

function setupContext(mode = "hex") {
	mockUseColorPicker.mockReturnValue({
		hue: 0,
		saturation: 100,
		lightness: 50,
		alpha: 100,
		mode,
		setHue: vi.fn(),
		setSaturation: vi.fn(),
		setLightness: vi.fn(),
		setAlpha: vi.fn(),
		setMode: mockSetMode,
	});
}

// ============================================================================
// TESTS
// ============================================================================

afterEach(cleanup);

describe("ColorPickerOutput", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupContext();
	});

	it("renders the select root", () => {
		render(<ColorPickerOutput />);
		expect(screen.getByTestId("select-root")).toBeInTheDocument();
	});

	it("renders all 4 format items: hex, rgb, css, hsl", () => {
		render(<ColorPickerOutput />);
		expect(screen.getByTestId("select-item-hex")).toBeInTheDocument();
		expect(screen.getByTestId("select-item-rgb")).toBeInTheDocument();
		expect(screen.getByTestId("select-item-css")).toBeInTheDocument();
		expect(screen.getByTestId("select-item-hsl")).toBeInTheDocument();
	});

	it("passes current mode as value to Select", () => {
		setupContext("rgb");
		render(<ColorPickerOutput />);
		expect(screen.getByTestId("select-root")).toHaveAttribute("data-value", "rgb");
	});

	it("calls setMode when the native select changes", async () => {
		render(<ColorPickerOutput />);
		const nativeSelect = screen.getByRole("combobox");
		await userEvent.selectOptions(nativeSelect, "hsl");
		expect(mockSetMode).toHaveBeenCalledWith("hsl");
	});

	it("renders format labels in uppercase", () => {
		render(<ColorPickerOutput />);
		expect(screen.getByTestId("select-item-hex").textContent).toBe("HEX");
		expect(screen.getByTestId("select-item-rgb").textContent).toBe("RGB");
		expect(screen.getByTestId("select-item-css").textContent).toBe("CSS");
		expect(screen.getByTestId("select-item-hsl").textContent).toBe("HSL");
	});
});
