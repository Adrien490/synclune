import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MOCKS
// ============================================================================

// Mock price-filter constants with identity-like functions for predictable test values
vi.mock("../constants/price-filter", () => ({
	SLIDER_MAX: 100,
	priceToSlider: (price: number, maxPrice: number) =>
		maxPrice > 0 ? Math.round((price / maxPrice) * 100) : 0,
	sliderToPrice: (position: number, maxPrice: number) => Math.round((position / 100) * maxPrice),
}));

// Mock Slider to a simple div with data-testid, forwarding onValueChange as a data attribute
vi.mock("@/shared/components/ui/slider", () => ({
	Slider: ({
		value,
		onValueChange,
		"data-vaul-no-drag": _nodrg,
		...props
	}: {
		value: [number, number];
		onValueChange: (v: number[]) => void;
		[key: string]: unknown;
	}) => (
		<div
			data-testid="slider"
			data-value={JSON.stringify(value)}
			onClick={() => onValueChange([10, 90])}
			{...props}
		/>
	),
}));

// Mock Input to render a plain <input> element so fireEvent works transparently
vi.mock("@/shared/components/ui/input", () => ({
	Input: ({
		className: _cls,
		inputMode: _inputMode,
		pattern: _pattern,
		...props
	}: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

import { PriceRangeInputs } from "../price-range-inputs";

// ============================================================================
// HELPERS
// ============================================================================

function renderComponent(value: [number, number] = [0, 400], maxPrice = 400, onChange = vi.fn()) {
	const result = render(<PriceRangeInputs value={value} onChange={onChange} maxPrice={maxPrice} />);
	const minInput = screen.getByLabelText("Prix minimum");
	const maxInput = screen.getByLabelText("Prix maximum");
	return { ...result, minInput, maxInput, onChange };
}

afterEach(cleanup);

// ============================================================================
// RENDERING
// ============================================================================

describe("PriceRangeInputs – rendering", () => {
	it("renders a fieldset with role group", () => {
		renderComponent();
		const fieldset = screen.getByRole("group");
		expect(fieldset.tagName).toBe("FIELDSET");
	});

	it("renders a legend with label text 'Prix (€)'", () => {
		renderComponent();
		// The legend element itself
		const legend = document.querySelector("legend");
		expect(legend).not.toBeNull();
		expect(legend!.textContent).toBe("Prix (€)");
	});

	it("renders min input with aria-label 'Prix minimum'", () => {
		renderComponent();
		expect(screen.getByLabelText("Prix minimum")).toBeInTheDocument();
	});

	it("renders max input with aria-label 'Prix maximum'", () => {
		renderComponent();
		expect(screen.getByLabelText("Prix maximum")).toBeInTheDocument();
	});

	it("renders the slider", () => {
		renderComponent();
		expect(screen.getByTestId("slider")).toBeInTheDocument();
	});

	it("renders the euro symbol", () => {
		renderComponent();
		expect(screen.getByText("€")).toBeInTheDocument();
	});

	it("initialises min input with the provided value[0]", () => {
		renderComponent([50, 200]);
		expect(screen.getByLabelText("Prix minimum")).toHaveValue("50");
	});

	it("initialises max input with the provided value[1]", () => {
		renderComponent([50, 200]);
		expect(screen.getByLabelText("Prix maximum")).toHaveValue("200");
	});

	it("renders a data-vaul-no-drag wrapper around the slider", () => {
		renderComponent();
		const slider = screen.getByTestId("slider");
		expect(slider.closest("[data-vaul-no-drag]")).not.toBeNull();
	});
});

// ============================================================================
// MIN INPUT – CHANGE
// ============================================================================

describe("PriceRangeInputs – min input change", () => {
	it("calls onChange with the typed value constrained to [0, value[1]]", () => {
		const onChange = vi.fn();
		render(<PriceRangeInputs value={[0, 400]} onChange={onChange} maxPrice={400} />);
		fireEvent.change(screen.getByLabelText("Prix minimum"), {
			target: { value: "100" },
		});
		expect(onChange).toHaveBeenCalledWith([100, 400]);
	});

	it("does NOT call onChange when input is empty string", () => {
		const onChange = vi.fn();
		render(<PriceRangeInputs value={[0, 400]} onChange={onChange} maxPrice={400} />);
		fireEvent.change(screen.getByLabelText("Prix minimum"), {
			target: { value: "" },
		});
		expect(onChange).not.toHaveBeenCalled();
	});

	it("does NOT call onChange when input is non-numeric text", () => {
		const onChange = vi.fn();
		render(<PriceRangeInputs value={[0, 400]} onChange={onChange} maxPrice={400} />);
		fireEvent.change(screen.getByLabelText("Prix minimum"), {
			target: { value: "abc" },
		});
		expect(onChange).not.toHaveBeenCalled();
	});
});

// ============================================================================
// MAX INPUT – CHANGE
// ============================================================================

describe("PriceRangeInputs – max input change", () => {
	it("calls onChange with the typed value constrained to [value[0], maxPrice]", () => {
		const onChange = vi.fn();
		render(<PriceRangeInputs value={[0, 400]} onChange={onChange} maxPrice={400} />);
		fireEvent.change(screen.getByLabelText("Prix maximum"), {
			target: { value: "300" },
		});
		expect(onChange).toHaveBeenCalledWith([0, 300]);
	});

	it("does NOT call onChange when input is empty string", () => {
		const onChange = vi.fn();
		render(<PriceRangeInputs value={[0, 400]} onChange={onChange} maxPrice={400} />);
		fireEvent.change(screen.getByLabelText("Prix maximum"), {
			target: { value: "" },
		});
		expect(onChange).not.toHaveBeenCalled();
	});

	it("does NOT call onChange when input is non-numeric text", () => {
		const onChange = vi.fn();
		render(<PriceRangeInputs value={[0, 400]} onChange={onChange} maxPrice={400} />);
		fireEvent.change(screen.getByLabelText("Prix maximum"), {
			target: { value: "xyz" },
		});
		expect(onChange).not.toHaveBeenCalled();
	});
});

// ============================================================================
// CONSTRAINT CLAMPING
// ============================================================================

describe("PriceRangeInputs – min value clamping", () => {
	it("clamps min value to 0 when a negative number is typed", () => {
		const onChange = vi.fn();
		render(<PriceRangeInputs value={[0, 400]} onChange={onChange} maxPrice={400} />);
		fireEvent.change(screen.getByLabelText("Prix minimum"), {
			target: { value: "-50" },
		});
		expect(onChange).toHaveBeenCalledWith([0, 400]);
	});

	it("clamps min value to value[1] when typed value exceeds current max", () => {
		const onChange = vi.fn();
		render(<PriceRangeInputs value={[0, 200]} onChange={onChange} maxPrice={400} />);
		fireEvent.change(screen.getByLabelText("Prix minimum"), {
			target: { value: "350" },
		});
		// Must be clamped to value[1] = 200
		expect(onChange).toHaveBeenCalledWith([200, 200]);
	});
});

describe("PriceRangeInputs – max value clamping", () => {
	it("clamps max value to maxPrice when typed value exceeds it", () => {
		const onChange = vi.fn();
		render(<PriceRangeInputs value={[0, 400]} onChange={onChange} maxPrice={400} />);
		fireEvent.change(screen.getByLabelText("Prix maximum"), {
			target: { value: "999" },
		});
		expect(onChange).toHaveBeenCalledWith([0, 400]);
	});

	it("clamps max value to value[0] when typed value is below current min", () => {
		const onChange = vi.fn();
		render(<PriceRangeInputs value={[100, 400]} onChange={onChange} maxPrice={400} />);
		fireEvent.change(screen.getByLabelText("Prix maximum"), {
			target: { value: "50" },
		});
		// Must be clamped to value[0] = 100
		expect(onChange).toHaveBeenCalledWith([100, 100]);
	});
});

// ============================================================================
// MIN BLUR VALIDATION
// ============================================================================

describe("PriceRangeInputs – min blur validation", () => {
	it("resets min input to value[0] when blurred with empty string", () => {
		render(<PriceRangeInputs value={[50, 400]} onChange={vi.fn()} maxPrice={400} />);
		const minInput = screen.getByLabelText("Prix minimum");
		fireEvent.change(minInput, { target: { value: "" } });
		fireEvent.blur(minInput);
		expect(minInput).toHaveValue("50");
	});

	it("resets min input to value[0] when blurred with NaN text", () => {
		render(<PriceRangeInputs value={[50, 400]} onChange={vi.fn()} maxPrice={400} />);
		const minInput = screen.getByLabelText("Prix minimum");
		fireEvent.change(minInput, { target: { value: "not-a-number" } });
		fireEvent.blur(minInput);
		expect(minInput).toHaveValue("50");
	});

	it("applies constrained value on blur when different from value[0]", () => {
		const onChange = vi.fn();
		// value[1] is 200 so typing 300 should be clamped to 200 on blur
		render(<PriceRangeInputs value={[50, 200]} onChange={onChange} maxPrice={400} />);
		const minInput = screen.getByLabelText("Prix minimum");
		// Simulate typing past max without triggering onChange (edge: direct DOM manipulation)
		// We use fireEvent.change then fireEvent.blur to verify blur corrects the value
		fireEvent.change(minInput, { target: { value: "300" } });
		onChange.mockClear();
		fireEvent.blur(minInput);
		// blur sees minInput="300", constrains to value[1]=200, calls onChange
		expect(onChange).toHaveBeenCalledWith([200, 200]);
	});

	it("does NOT call onChange on blur when constrained value equals value[0]", () => {
		const onChange = vi.fn();
		render(<PriceRangeInputs value={[50, 400]} onChange={onChange} maxPrice={400} />);
		const minInput = screen.getByLabelText("Prix minimum");
		fireEvent.change(minInput, { target: { value: "50" } });
		onChange.mockClear();
		fireEvent.blur(minInput);
		expect(onChange).not.toHaveBeenCalled();
	});
});

// ============================================================================
// MAX BLUR VALIDATION
// ============================================================================

describe("PriceRangeInputs – max blur validation", () => {
	it("resets max input to value[1] when blurred with empty string", () => {
		render(<PriceRangeInputs value={[0, 300]} onChange={vi.fn()} maxPrice={400} />);
		const maxInput = screen.getByLabelText("Prix maximum");
		fireEvent.change(maxInput, { target: { value: "" } });
		fireEvent.blur(maxInput);
		expect(maxInput).toHaveValue("300");
	});

	it("resets max input to value[1] when blurred with NaN text", () => {
		render(<PriceRangeInputs value={[0, 300]} onChange={vi.fn()} maxPrice={400} />);
		const maxInput = screen.getByLabelText("Prix maximum");
		fireEvent.change(maxInput, { target: { value: "not-a-number" } });
		fireEvent.blur(maxInput);
		expect(maxInput).toHaveValue("300");
	});

	it("applies constrained value on blur when different from value[1]", () => {
		const onChange = vi.fn();
		// value[0]=100, typing 50 on max should be clamped to 100 on blur
		render(<PriceRangeInputs value={[100, 300]} onChange={onChange} maxPrice={400} />);
		const maxInput = screen.getByLabelText("Prix maximum");
		fireEvent.change(maxInput, { target: { value: "50" } });
		onChange.mockClear();
		fireEvent.blur(maxInput);
		expect(onChange).toHaveBeenCalledWith([100, 100]);
	});

	it("does NOT call onChange on blur when constrained value equals value[1]", () => {
		const onChange = vi.fn();
		render(<PriceRangeInputs value={[0, 300]} onChange={onChange} maxPrice={400} />);
		const maxInput = screen.getByLabelText("Prix maximum");
		fireEvent.change(maxInput, { target: { value: "300" } });
		onChange.mockClear();
		fireEvent.blur(maxInput);
		expect(onChange).not.toHaveBeenCalled();
	});
});

// ============================================================================
// EXTERNAL VALUE SYNC (rerender)
// ============================================================================

describe("PriceRangeInputs – external value sync", () => {
	it("updates min input when value[0] prop changes (via rerender)", async () => {
		const onChange = vi.fn();
		const { rerender } = render(
			<PriceRangeInputs value={[0, 400]} onChange={onChange} maxPrice={400} />,
		);
		expect(screen.getByLabelText("Prix minimum")).toHaveValue("0");

		await act(async () => {
			rerender(<PriceRangeInputs value={[150, 400]} onChange={onChange} maxPrice={400} />);
			// Flush all queued microtasks (queueMicrotask defers past a single tick)
			await new Promise((r) => setTimeout(r, 0));
		});

		expect(screen.getByLabelText("Prix minimum")).toHaveValue("150");
	});

	it("updates max input when value[1] prop changes (via rerender)", async () => {
		const onChange = vi.fn();
		const { rerender } = render(
			<PriceRangeInputs value={[0, 400]} onChange={onChange} maxPrice={400} />,
		);
		expect(screen.getByLabelText("Prix maximum")).toHaveValue("400");

		await act(async () => {
			rerender(<PriceRangeInputs value={[0, 250]} onChange={onChange} maxPrice={400} />);
			await new Promise((r) => setTimeout(r, 0));
		});

		expect(screen.getByLabelText("Prix maximum")).toHaveValue("250");
	});
});

// ============================================================================
// ACCESSIBILITY
// ============================================================================

describe("PriceRangeInputs – accessibility", () => {
	it("fieldset has role='group'", () => {
		renderComponent();
		expect(screen.getByRole("group")).toBeInTheDocument();
	});

	it("min input has aria-description='en euros'", () => {
		renderComponent();
		expect(screen.getByLabelText("Prix minimum")).toHaveAttribute("aria-description", "en euros");
	});

	it("max input has aria-description='en euros'", () => {
		renderComponent();
		expect(screen.getByLabelText("Prix maximum")).toHaveAttribute("aria-description", "en euros");
	});

	it("slider container has data-vaul-no-drag attribute", () => {
		renderComponent();
		const slider = screen.getByTestId("slider");
		const wrapper = slider.closest("[data-vaul-no-drag]");
		expect(wrapper).not.toBeNull();
		// The attribute should be present (empty string is a valid truthy attribute)
		expect(wrapper).toHaveAttribute("data-vaul-no-drag");
	});
});
