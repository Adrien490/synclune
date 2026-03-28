import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

vi.mock("@/shared/components/ui/input", () => ({
	Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock("@/shared/components/ui/label", () => ({
	Label: ({
		children,
		htmlFor,
		className,
	}: {
		children: React.ReactNode;
		htmlFor?: string;
		className?: string;
	}) => (
		<label htmlFor={htmlFor} className={className}>
			{children}
		</label>
	),
}));

import { AmountRangeInputs } from "../amount-range-inputs";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("AmountRangeInputs", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders without crashing", () => {
		render(<AmountRangeInputs value={[0, 10000]} onChange={vi.fn()} />);
		expect(screen.getByText("Montant de la commande")).toBeInTheDocument();
	});

	it("renders fieldset legend", () => {
		render(<AmountRangeInputs value={[0, 10000]} onChange={vi.fn()} />);
		expect(screen.getByText("Montant de la commande")).toBeInTheDocument();
	});

	it("renders Min label", () => {
		render(<AmountRangeInputs value={[0, 10000]} onChange={vi.fn()} />);
		expect(screen.getByText("Min")).toBeInTheDocument();
	});

	it("renders Max label", () => {
		render(<AmountRangeInputs value={[0, 10000]} onChange={vi.fn()} />);
		expect(screen.getByText("Max")).toBeInTheDocument();
	});

	it("renders min input with id 'price-min'", () => {
		render(<AmountRangeInputs value={[100, 5000]} onChange={vi.fn()} />);
		expect(screen.getByRole("spinbutton", { name: "Min" })).toBeInTheDocument();
	});

	it("renders max input with id 'price-max'", () => {
		render(<AmountRangeInputs value={[100, 5000]} onChange={vi.fn()} />);
		expect(screen.getByRole("spinbutton", { name: "Max" })).toBeInTheDocument();
	});

	it("shows current min value in min input", () => {
		render(<AmountRangeInputs value={[200, 5000]} onChange={vi.fn()} />);
		const minInput = screen.getByRole("spinbutton", { name: "Min" });
		expect(minInput).toHaveValue(200);
	});

	it("shows current max value in max input", () => {
		render(<AmountRangeInputs value={[200, 5000]} onChange={vi.fn()} />);
		const maxInput = screen.getByRole("spinbutton", { name: "Max" });
		expect(maxInput).toHaveValue(5000);
	});

	it("renders two EUR currency labels", () => {
		render(<AmountRangeInputs value={[0, 10000]} onChange={vi.fn()} />);
		const eurLabels = screen.getAllByText("EUR");
		expect(eurLabels).toHaveLength(2);
	});

	it("calls onChange with updated min value when min input changes", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(<AmountRangeInputs value={[0, 10000]} onChange={onChange} />);
		const minInput = screen.getByRole("spinbutton", { name: "Min" });
		await user.clear(minInput);
		await user.type(minInput, "500");
		expect(onChange).toHaveBeenCalled();
	});

	it("calls onChange with updated max value when max input changes", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(<AmountRangeInputs value={[0, 10000]} onChange={onChange} />);
		const maxInput = screen.getByRole("spinbutton", { name: "Max" });
		await user.clear(maxInput);
		await user.type(maxInput, "8000");
		expect(onChange).toHaveBeenCalled();
	});

	it("uses default maxPrice of 10000 when not provided", () => {
		render(<AmountRangeInputs value={[0, 10000]} onChange={vi.fn()} />);
		const maxInput = screen.getByRole("spinbutton", { name: "Max" });
		expect(maxInput).toHaveAttribute("max", "10000");
	});

	it("respects custom maxPrice prop", () => {
		render(<AmountRangeInputs value={[0, 5000]} onChange={vi.fn()} maxPrice={5000} />);
		const maxInput = screen.getByRole("spinbutton", { name: "Max" });
		expect(maxInput).toHaveAttribute("max", "5000");
	});
});
