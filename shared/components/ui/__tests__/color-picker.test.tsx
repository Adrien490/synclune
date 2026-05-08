import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// jsdom STUBS for Radix Slider / Accordion internals
// ============================================================================

class MockResizeObserver {
	observe = vi.fn();
	unobserve = vi.fn();
	disconnect = vi.fn();
}
vi.stubGlobal("ResizeObserver", MockResizeObserver);

// jsdom does not implement element.hasPointerCapture / setPointerCapture used by Radix Slider
if (typeof Element !== "undefined") {
	if (!Element.prototype.hasPointerCapture) {
		Element.prototype.hasPointerCapture = () => false;
	}
	if (!Element.prototype.setPointerCapture) {
		Element.prototype.setPointerCapture = () => {};
	}
	if (!Element.prototype.releasePointerCapture) {
		Element.prototype.releasePointerCapture = () => {};
	}
	if (!Element.prototype.scrollIntoView) {
		Element.prototype.scrollIntoView = () => {};
	}
}

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockHaptic, recentsStore } = vi.hoisted(() => ({
	mockHaptic: vi.fn(),
	recentsStore: {
		recents: [] as string[],
		push: vi.fn(),
	},
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => mockHaptic,
}));

vi.mock("@/shared/hooks/use-recent-colors", () => ({
	useRecentColors: () => recentsStore,
}));

import { ColorPicker, type ColorPreset } from "../color-picker";

const PRESETS: readonly ColorPreset[] = [
	{ name: "Or 18 carats", hex: "#D4AF37" },
	{ name: "Argent 925", hex: "#C0C0C0" },
	{ name: "Rubis", hex: "#9B111E" },
];

afterEach(() => {
	cleanup();
	recentsStore.recents = [];
});

describe("ColorPicker", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		recentsStore.recents = [];
	});

	// ─── Rendering ────────────────────────────────────────────────────────────

	it("renders the preview swatch with the current hex", () => {
		render(<ColorPicker value="#FF0000" onChange={() => {}} />);
		const previewHex = screen.getByTestId("color-picker-preview-hex");
		expect(previewHex.textContent).toBe("#FF0000");
		const preview = screen.getByTestId("color-picker-preview");
		expect(preview.style.backgroundColor).toBeTruthy();
	});

	it("renders the editable hex input prefilled with the current value", () => {
		render(<ColorPicker value="#abcdef" onChange={() => {}} />);
		const input = screen.getByTestId("color-picker-hex-input") as HTMLInputElement;
		expect(input.value).toBe("#ABCDEF");
		expect(input.readOnly).toBe(false);
	});

	it("falls back to #000000 when value prop is invalid", () => {
		render(<ColorPicker value="not-a-hex" onChange={() => {}} />);
		const input = screen.getByTestId("color-picker-hex-input") as HTMLInputElement;
		expect(input.value).toBe("#000000");
	});

	it("does not render the presets group when presets prop is empty", () => {
		render(<ColorPicker value="#000000" onChange={() => {}} />);
		expect(screen.queryByTestId("color-picker-presets")).not.toBeInTheDocument();
	});

	it("does not render the recents group when recents are empty", () => {
		render(<ColorPicker value="#000000" onChange={() => {}} presets={PRESETS} />);
		expect(screen.queryByTestId("color-picker-recents")).not.toBeInTheDocument();
	});

	// ─── Presets ──────────────────────────────────────────────────────────────

	it("renders the presets palette with WCAG-compliant swatches", () => {
		render(<ColorPicker value="#000000" onChange={() => {}} presets={PRESETS} />);
		const presets = screen.getByTestId("color-picker-presets");
		expect(presets).toBeInTheDocument();
		const swatches = presets.querySelectorAll('button[role="radio"]');
		expect(swatches.length).toBe(3);
		swatches.forEach((swatch) => {
			expect(swatch.className).toContain("min-h-11");
			expect(swatch.className).toContain("min-w-11");
		});
	});

	it("calls onChange (uppercase hex) and fires haptic on swatch tap", () => {
		const onChange = vi.fn();
		render(<ColorPicker value="#000000" onChange={onChange} presets={PRESETS} />);
		fireEvent.click(screen.getByLabelText("Or 18 carats"));
		expect(onChange).toHaveBeenCalledWith("#D4AF37");
		expect(mockHaptic).toHaveBeenCalledWith("selection");
	});

	it("marks the selected preset with aria-checked=true", () => {
		render(<ColorPicker value="#D4AF37" onChange={() => {}} presets={PRESETS} />);
		const selected = screen.getByLabelText("Or 18 carats");
		expect(selected.getAttribute("aria-checked")).toBe("true");
		const other = screen.getByLabelText("Argent 925");
		expect(other.getAttribute("aria-checked")).toBe("false");
	});

	it("pushes the chosen color into recents on swatch tap", () => {
		render(<ColorPicker value="#000000" onChange={() => {}} presets={PRESETS} />);
		fireEvent.click(screen.getByLabelText("Rubis"));
		expect(recentsStore.push).toHaveBeenCalledWith("#9B111E");
	});

	// ─── Recents ──────────────────────────────────────────────────────────────

	it("renders the recents grid when the hook returns entries", () => {
		recentsStore.recents = ["#111111", "#222222"];
		render(<ColorPicker value="#000000" onChange={() => {}} presets={PRESETS} />);
		const recents = screen.getByTestId("color-picker-recents");
		expect(recents).toBeInTheDocument();
		const swatches = recents.querySelectorAll('button[role="radio"]');
		expect(swatches.length).toBe(2);
	});

	// ─── Hex input ────────────────────────────────────────────────────────────

	it("commits a pasted full hex on blur and calls onChange", () => {
		const onChange = vi.fn();
		render(<ColorPicker value="#000000" onChange={onChange} />);
		const input = screen.getByTestId("color-picker-hex-input") as HTMLInputElement;
		fireEvent.change(input, { target: { value: "#ff5733" } });
		fireEvent.blur(input);
		expect(onChange).toHaveBeenCalledWith("#FF5733");
	});

	it("commits on Enter, blurs the input, and triggers haptic light", () => {
		const onChange = vi.fn();
		render(<ColorPicker value="#000000" onChange={onChange} />);
		const input = screen.getByTestId("color-picker-hex-input") as HTMLInputElement;
		fireEvent.change(input, { target: { value: "#abcdef" } });
		fireEvent.keyDown(input, { key: "Enter" });
		expect(onChange).toHaveBeenCalledWith("#ABCDEF");
		expect(mockHaptic).toHaveBeenCalledWith("light");
	});

	it("normalizes a 3-char hex and a value without leading hash", () => {
		const onChange = vi.fn();
		render(<ColorPicker value="#000000" onChange={onChange} />);
		const input = screen.getByTestId("color-picker-hex-input") as HTMLInputElement;
		fireEvent.change(input, { target: { value: "f57" } });
		fireEvent.blur(input);
		expect(onChange).toHaveBeenCalledWith("#FF5577");
	});

	it("rejects an invalid hex with an error message and fires haptic 'error'", () => {
		const onChange = vi.fn();
		render(<ColorPicker value="#000000" onChange={onChange} />);
		const input = screen.getByTestId("color-picker-hex-input") as HTMLInputElement;
		fireEvent.change(input, { target: { value: "xyz" } });
		fireEvent.blur(input);
		expect(onChange).not.toHaveBeenCalled();
		expect(mockHaptic).toHaveBeenCalledWith("error");
		const errorMsg = screen.getByRole("alert");
		expect(errorMsg.textContent).toMatch(/format invalide/i);
		expect(input.getAttribute("aria-invalid")).toBe("true");
	});

	it("clears the error state when the user starts typing again", () => {
		render(<ColorPicker value="#000000" onChange={() => {}} />);
		const input = screen.getByTestId("color-picker-hex-input") as HTMLInputElement;
		fireEvent.change(input, { target: { value: "xyz" } });
		fireEvent.blur(input);
		expect(screen.getByRole("alert")).toBeInTheDocument();
		fireEvent.change(input, { target: { value: "#" } });
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});

	it("restores the last committed value on Escape", () => {
		render(<ColorPicker value="#FF0000" onChange={() => {}} />);
		const input = screen.getByTestId("color-picker-hex-input") as HTMLInputElement;
		fireEvent.change(input, { target: { value: "garbage" } });
		fireEvent.keyDown(input, { key: "Escape" });
		expect(input.value).toBe("#FF0000");
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});

	it("restores the last committed value when blurring an empty input", () => {
		render(<ColorPicker value="#FF0000" onChange={() => {}} />);
		const input = screen.getByTestId("color-picker-hex-input") as HTMLInputElement;
		fireEvent.change(input, { target: { value: "" } });
		fireEvent.blur(input);
		expect(input.value).toBe("#FF0000");
	});

	it("uses iOS-friendly input attributes to avoid keyboard zoom and autocorrect", () => {
		render(<ColorPicker value="#000000" onChange={() => {}} />);
		const input = screen.getByTestId("color-picker-hex-input") as HTMLInputElement;
		expect(input.getAttribute("inputmode")).toBe("text");
		expect(input.getAttribute("autocapitalize")).toBe("characters");
		expect(input.getAttribute("autocomplete")).toBe("off");
		expect(input.getAttribute("autocorrect")).toBe("off");
		expect(input.getAttribute("spellcheck")).toBe("false");
		expect(input.getAttribute("enterkeyhint")).toBe("done");
		expect(input.getAttribute("maxlength")).toBe("7");
	});

	// ─── Disabled ─────────────────────────────────────────────────────────────

	it("applies pointer-events-none + opacity-50 + aria-disabled when disabled", () => {
		const { container } = render(
			<ColorPicker value="#000000" onChange={() => {}} disabled presets={PRESETS} />,
		);
		const root = container.querySelector('[data-slot="color-picker"]') as HTMLElement;
		expect(root.className).toContain("pointer-events-none");
		expect(root.className).toContain("opacity-50");
		expect(root.getAttribute("aria-disabled")).toBe("true");
		const input = screen.getByTestId("color-picker-hex-input") as HTMLInputElement;
		expect(input.disabled).toBe(true);
	});

	it("does not call onChange or haptic when disabled and a swatch is clicked", () => {
		const onChange = vi.fn();
		render(<ColorPicker value="#000000" onChange={onChange} disabled presets={PRESETS} />);
		fireEvent.click(screen.getByLabelText("Or 18 carats"));
		expect(onChange).not.toHaveBeenCalled();
		expect(mockHaptic).not.toHaveBeenCalled();
	});

	// ─── External value sync ──────────────────────────────────────────────────

	it("re-syncs when the value prop is replaced from outside", () => {
		const { rerender } = render(<ColorPicker value="#FF0000" onChange={() => {}} />);
		const input = screen.getByTestId("color-picker-hex-input") as HTMLInputElement;
		expect(input.value).toBe("#FF0000");
		rerender(<ColorPicker value="#00FF00" onChange={() => {}} />);
		expect(input.value).toBe("#00FF00");
	});

	// ─── View Transitions ────────────────────────────────────────────────────

	it("applies a viewTransitionName to the preview swatch for cross-state morph", () => {
		render(<ColorPicker value="#FF0000" onChange={() => {}} />);
		const preview = screen.getByTestId("color-picker-preview");
		expect(preview.style.viewTransitionName).toBe("color-picker-preview");
	});

	// ─── Accordion (custom canvas) ───────────────────────────────────────────

	it("renders the 'Personnaliser' accordion trigger", () => {
		render(<ColorPicker value="#000000" onChange={() => {}} />);
		expect(screen.getByRole("button", { name: /personnaliser/i })).toBeInTheDocument();
	});
});
