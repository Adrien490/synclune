import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockUseColorPicker } = vi.hoisted(() => ({
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

vi.mock("@/shared/components/ui/input", () => ({
	Input: ({
		value,
		"aria-label": ariaLabel,
		...props
	}: {
		value?: unknown;
		"aria-label"?: string;
		[key: string]: unknown;
	}) => <input aria-label={ariaLabel} value={String(value ?? "")} readOnly {...props} />,
}));

// ============================================================================
// IMPORTS AFTER MOCKS
// ============================================================================

import { ColorPickerFormat } from "../color-picker-format";

// ============================================================================
// HELPERS
// ============================================================================

function setupContext(mode: string, overrides: Record<string, unknown> = {}) {
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
		setMode: vi.fn(),
		...overrides,
	});
}

// ============================================================================
// TESTS
// ============================================================================

afterEach(cleanup);

describe("ColorPickerFormat - hex mode", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupContext("hex");
	});

	it("renders the hex input with aria-label", () => {
		render(<ColorPickerFormat />);
		expect(screen.getByLabelText("Code hexadécimal")).toBeInTheDocument();
	});

	it("renders the alpha percentage input", () => {
		render(<ColorPickerFormat />);
		expect(screen.getByLabelText("Opacité en pourcentage")).toBeInTheDocument();
	});

	it("has data-slot=color-picker-format", () => {
		const { container } = render(<ColorPickerFormat />);
		expect(container.querySelector("[data-slot='color-picker-format']")).toBeInTheDocument();
	});

	it("shows hex value starting with #", () => {
		render(<ColorPickerFormat />);
		const hexInput = screen.getByLabelText("Code hexadécimal") as HTMLInputElement;
		expect(hexInput.value).toMatch(/^#/);
	});

	it("shows alpha value", () => {
		setupContext("hex", { alpha: 80 });
		render(<ColorPickerFormat />);
		const alphaInput = screen.getByLabelText("Opacité en pourcentage") as HTMLInputElement;
		expect(alphaInput.value).toBe("80");
	});
});

describe("ColorPickerFormat - rgb mode", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupContext("rgb");
	});

	it("renders Rouge, Vert, Bleu inputs", () => {
		render(<ColorPickerFormat />);
		expect(screen.getByLabelText("Rouge")).toBeInTheDocument();
		expect(screen.getByLabelText("Vert")).toBeInTheDocument();
		expect(screen.getByLabelText("Bleu")).toBeInTheDocument();
	});

	it("renders the alpha percentage input", () => {
		render(<ColorPickerFormat />);
		expect(screen.getByLabelText("Opacité en pourcentage")).toBeInTheDocument();
	});

	it("shows numeric values for pure red (hue=0, sat=100, light=50)", () => {
		setupContext("rgb", { hue: 0, saturation: 100, lightness: 50 });
		render(<ColorPickerFormat />);
		const rouge = screen.getByLabelText("Rouge") as HTMLInputElement;
		expect(Number(rouge.value)).toBeGreaterThan(200);
	});
});

describe("ColorPickerFormat - css mode", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupContext("css");
	});

	it("renders CSS RGBA input", () => {
		render(<ColorPickerFormat />);
		expect(screen.getByLabelText("Code CSS RGBA")).toBeInTheDocument();
	});

	it("value starts with rgba(", () => {
		render(<ColorPickerFormat />);
		const input = screen.getByLabelText("Code CSS RGBA") as HTMLInputElement;
		expect(input.value).toMatch(/^rgba\(/);
	});
});

describe("ColorPickerFormat - hsl mode", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupContext("hsl");
	});

	it("renders Teinte, Saturation, Luminosité inputs", () => {
		render(<ColorPickerFormat />);
		expect(screen.getByLabelText("Teinte")).toBeInTheDocument();
		expect(screen.getByLabelText("Saturation")).toBeInTheDocument();
		expect(screen.getByLabelText("Luminosité")).toBeInTheDocument();
	});

	it("renders the alpha percentage input", () => {
		render(<ColorPickerFormat />);
		expect(screen.getByLabelText("Opacité en pourcentage")).toBeInTheDocument();
	});
});

describe("ColorPickerFormat - unknown mode", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders nothing for unknown mode", () => {
		setupContext("unknown");
		const { container } = render(<ColorPickerFormat />);
		expect(container.firstChild).toBeNull();
	});
});
