import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockHaptic } = vi.hoisted(() => ({ mockHaptic: vi.fn() }));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => mockHaptic,
}));

// ============================================================================
// IMPORTS
// ============================================================================

import { HexColorInput } from "../hex-color-input";

// ============================================================================
// HELPERS
// ============================================================================

function getHexTextInput(): HTMLInputElement {
	// Single text input in the component (textbox role)
	return screen.getByRole("textbox") as HTMLInputElement;
}

function getNativeColorInput(): HTMLInputElement {
	return screen.getByLabelText(/Sélecteur de couleur visuel/i) as HTMLInputElement;
}

// ============================================================================
// TESTS
// ============================================================================

afterEach(cleanup);

describe("HexColorInput", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders with initial value stripped of # and uppercased", () => {
		render(<HexColorInput value="#ff5733" onChange={vi.fn()} />);
		expect(getHexTextInput().value).toBe("FF5733");
	});

	it("expands #RGB to #RRGGBB for the native color picker", () => {
		render(<HexColorInput value="#F57" onChange={vi.fn()} />);
		expect(getNativeColorInput().value).toBe("#ff5577");
	});

	it("renders helper text describing the format", () => {
		render(<HexColorInput value="#000000" onChange={vi.fn()} />);
		expect(screen.getByText(/Format hexadécimal sur 3 ou 6 caractères/i)).toBeInTheDocument();
	});

	it("filters out non-hex characters from text input", async () => {
		const onChange = vi.fn();
		render(<HexColorInput value="#000000" onChange={onChange} />);
		const input = getHexTextInput();
		await userEvent.clear(input);
		await userEvent.type(input, "GHIxyz");
		expect(input.value).toBe("");
		expect(onChange).not.toHaveBeenCalled();
	});

	it("emits onChange with normalized hex when 6 chars typed", async () => {
		const onChange = vi.fn();
		render(<HexColorInput value="#000000" onChange={onChange} />);
		const input = getHexTextInput();
		await userEvent.clear(input);
		await userEvent.type(input, "FF5733");
		expect(onChange).toHaveBeenLastCalledWith("#FF5733");
	});

	it("does not emit at 3-char length while typing — only commits on blur", async () => {
		const onChange = vi.fn();
		render(<HexColorInput value="#000000" onChange={onChange} />);
		const input = getHexTextInput();
		await userEvent.clear(input);
		await userEvent.type(input, "F57");
		expect(onChange).not.toHaveBeenCalled();
	});

	it("emits normalized #RRGGBB on blur when text is a 3-char shorthand", async () => {
		const onChange = vi.fn();
		render(<HexColorInput value="#000000" onChange={onChange} />);
		const input = getHexTextInput();
		await userEvent.clear(input);
		await userEvent.type(input, "F57");
		fireEvent.blur(input);
		expect(onChange).toHaveBeenCalledWith("#FF5577");
		expect(input.value).toBe("FF5577");
	});

	it("uppercases lowercase typed hex chars before emitting", async () => {
		const onChange = vi.fn();
		render(<HexColorInput value="#000000" onChange={onChange} />);
		const input = getHexTextInput();
		await userEvent.clear(input);
		await userEvent.type(input, "abcdef");
		expect(onChange).toHaveBeenLastCalledWith("#ABCDEF");
		expect(input.value).toBe("ABCDEF");
	});

	it("does not emit while length is partial (1-5 chars)", async () => {
		const onChange = vi.fn();
		render(<HexColorInput value="#000000" onChange={onChange} />);
		const input = getHexTextInput();
		await userEvent.clear(input);
		await userEvent.type(input, "FF5");
		expect(onChange).not.toHaveBeenCalled();
		await userEvent.type(input, "73");
		expect(onChange).not.toHaveBeenCalled();
	});

	it("keeps aria-invalid=false while typing partial input (WCAG 3.3.1 — no premature error)", async () => {
		render(<HexColorInput value="#000000" onChange={vi.fn()} />);
		const input = getHexTextInput();
		await userEvent.clear(input);
		await userEvent.type(input, "FF");
		expect(input).toHaveAttribute("aria-invalid", "false");
	});

	it("keeps aria-invalid=false once text reaches a valid length", async () => {
		render(<HexColorInput value="#000000" onChange={vi.fn()} />);
		const input = getHexTextInput();
		await userEvent.clear(input);
		await userEvent.type(input, "FF5733");
		expect(input).toHaveAttribute("aria-invalid", "false");
	});

	it("forwards parent aria-invalid prop when provided (server-side error)", () => {
		render(<HexColorInput value="#000000" onChange={vi.fn()} aria-invalid={true} />);
		const input = getHexTextInput();
		expect(input).toHaveAttribute("aria-invalid", "true");
	});

	it("reverts to last emitted value on blur with partial input", async () => {
		const onChange = vi.fn();
		render(<HexColorInput value="#FF5733" onChange={onChange} />);
		const input = getHexTextInput();
		await userEvent.clear(input);
		await userEvent.type(input, "AB");
		fireEvent.blur(input);
		expect(input.value).toBe("FF5733");
	});

	it("emits selection haptic and onChange when native color picker commits", () => {
		const onChange = vi.fn();
		render(<HexColorInput value="#000000" onChange={onChange} />);
		const native = getNativeColorInput();
		fireEvent.change(native, { target: { value: "#aa00ff" } });
		expect(onChange).toHaveBeenCalledWith("#AA00FF");
		expect(mockHaptic).toHaveBeenCalledWith("selection");
	});

	it("triggers light haptic when text input commits a valid hex", async () => {
		render(<HexColorInput value="#000000" onChange={vi.fn()} />);
		const input = getHexTextInput();
		await userEvent.clear(input);
		await userEvent.type(input, "FF5733");
		expect(mockHaptic).toHaveBeenCalledWith("light");
	});

	it("syncs the text input when the value prop changes externally", () => {
		const { rerender } = render(<HexColorInput value="#000000" onChange={vi.fn()} />);
		expect(getHexTextInput().value).toBe("000000");
		rerender(<HexColorInput value="#D4AF37" onChange={vi.fn()} />);
		expect(getHexTextInput().value).toBe("D4AF37");
		expect(getNativeColorInput().value).toBe("#d4af37");
	});

	it("does not re-emit when the external value matches its own last emission", async () => {
		const onChange = vi.fn();
		const { rerender } = render(<HexColorInput value="#000000" onChange={onChange} />);
		const input = getHexTextInput();
		await userEvent.clear(input);
		await userEvent.type(input, "FF5733");
		expect(onChange).toHaveBeenCalledTimes(1);
		rerender(<HexColorInput value="#FF5733" onChange={onChange} />);
		expect(onChange).toHaveBeenCalledTimes(1);
	});

	it("disables both inputs and skips haptic/onChange when disabled", () => {
		const onChange = vi.fn();
		render(<HexColorInput value="#000000" onChange={onChange} disabled />);
		expect(getHexTextInput()).toBeDisabled();
		expect(getNativeColorInput()).toBeDisabled();
		fireEvent.change(getNativeColorInput(), { target: { value: "#aa00ff" } });
		expect(onChange).not.toHaveBeenCalled();
		expect(mockHaptic).not.toHaveBeenCalled();
	});

	it("caps text input at 6 characters", async () => {
		render(<HexColorInput value="#000000" onChange={vi.fn()} />);
		const input = getHexTextInput();
		await userEvent.clear(input);
		await userEvent.type(input, "ABCDEFFF");
		expect(input.value).toBe("ABCDEF");
	});

	it("uses a stable input id when none is provided", () => {
		render(<HexColorInput value="#000000" onChange={vi.fn()} />);
		expect(getHexTextInput().id).toBe("hex-color-input");
	});

	it("respects a custom id prop", () => {
		render(<HexColorInput value="#000000" onChange={vi.fn()} id="my-color" />);
		expect(getHexTextInput().id).toBe("my-color");
	});

	describe("Clear button", () => {
		it("does not render when text input is empty", () => {
			render(<HexColorInput value="" onChange={vi.fn()} />);
			expect(
				screen.queryByRole("button", { name: /Effacer le code couleur/ }),
			).not.toBeInTheDocument();
		});

		it("renders when text has content", () => {
			render(<HexColorInput value="#FF5733" onChange={vi.fn()} />);
			expect(screen.getByRole("button", { name: /Effacer le code couleur/ })).toBeInTheDocument();
		});

		it("clears text and emits empty onChange when clicked", () => {
			const onChange = vi.fn();
			render(<HexColorInput value="#FF5733" onChange={onChange} />);
			const clearBtn = screen.getByRole("button", { name: /Effacer le code couleur/ });
			fireEvent.click(clearBtn);
			expect(onChange).toHaveBeenCalledWith("");
			expect(getHexTextInput().value).toBe("");
		});

		it("does not render when disabled", () => {
			render(<HexColorInput value="#FF5733" onChange={vi.fn()} disabled />);
			expect(
				screen.queryByRole("button", { name: /Effacer le code couleur/ }),
			).not.toBeInTheDocument();
		});
	});

	describe("EyeDropper API", () => {
		afterEach(() => {
			delete (window as unknown as { EyeDropper?: unknown }).EyeDropper;
		});

		it("does not render the pipette button when EyeDropper API is unavailable", () => {
			render(<HexColorInput value="#000000" onChange={vi.fn()} />);
			expect(
				screen.queryByRole("button", { name: /Piocher une couleur à l'écran/ }),
			).not.toBeInTheDocument();
		});

		it("renders the pipette button when EyeDropper API is available", () => {
			class MockEyeDropper {
				open = vi.fn().mockResolvedValue({ sRGBHex: "#aa00ff" });
			}
			(window as unknown as { EyeDropper: unknown }).EyeDropper = MockEyeDropper;
			render(<HexColorInput value="#000000" onChange={vi.fn()} />);
			expect(
				screen.getByRole("button", { name: /Piocher une couleur à l'écran/ }),
			).toBeInTheDocument();
		});

		it("opens EyeDropper and emits normalized hex + success haptic on success", async () => {
			const openSpy = vi.fn().mockResolvedValue({ sRGBHex: "#aa00ff" });
			class MockEyeDropper {
				open = openSpy;
			}
			(window as unknown as { EyeDropper: unknown }).EyeDropper = MockEyeDropper;
			const onChange = vi.fn();
			render(<HexColorInput value="#000000" onChange={onChange} />);
			const btn = screen.getByRole("button", { name: /Piocher une couleur à l'écran/ });
			fireEvent.click(btn);
			await vi.waitFor(() => {
				expect(openSpy).toHaveBeenCalled();
				expect(onChange).toHaveBeenCalledWith("#AA00FF");
				expect(mockHaptic).toHaveBeenCalledWith("success");
			});
		});

		it("ignores AbortError when user cancels EyeDropper", async () => {
			class MockEyeDropper {
				open = vi.fn().mockRejectedValue(new Error("AbortError"));
			}
			(window as unknown as { EyeDropper: unknown }).EyeDropper = MockEyeDropper;
			const onChange = vi.fn();
			render(<HexColorInput value="#000000" onChange={onChange} />);
			const btn = screen.getByRole("button", { name: /Piocher une couleur à l'écran/ });
			fireEvent.click(btn);
			await new Promise((r) => setTimeout(r, 10));
			expect(onChange).not.toHaveBeenCalled();
		});
	});
});
