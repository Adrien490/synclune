import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

vi.mock("@/shared/components/ui/select", () => ({
	Select: ({
		children,
		value,
		onValueChange: _onValueChange,
		disabled,
	}: {
		children: React.ReactNode;
		value?: string;
		onValueChange?: (value: string) => void;
		disabled?: boolean;
	}) => (
		<div data-testid="radix-select" data-value={value} data-disabled={disabled}>
			{children}
		</div>
	),
	SelectTrigger: ({
		children,
		id,
		"aria-invalid": ariaInvalid,
	}: {
		children: React.ReactNode;
		id?: string;
		size?: string;
		className?: string;
		"aria-invalid"?: boolean;
		"aria-describedby"?: string;
	}) => (
		<button id={id} data-invalid={ariaInvalid}>
			{children}
		</button>
	),
	SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
	SelectContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="select-content">{children}</div>
	),
	SelectGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	SelectLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	SelectItem: ({
		children,
		value,
		disabled,
	}: {
		children: React.ReactNode;
		value: string;
		disabled?: boolean;
	}) => (
		<div role="option" data-value={value} aria-selected={false} aria-disabled={disabled}>
			{children}
		</div>
	),
}));

vi.mock("@/shared/components/ui/native-select", () => ({
	NativeSelect: ({
		children,
		id,
		value,
		onChange,
		disabled,
		"aria-invalid": ariaInvalid,
	}: {
		children: React.ReactNode;
		id?: string;
		value?: string;
		onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
		disabled?: boolean;
		name?: string;
		required?: boolean;
		size?: string;
		className?: string;
		"aria-invalid"?: boolean;
		"aria-describedby"?: string;
	}) => (
		<select
			data-testid="native-select"
			id={id}
			value={value}
			onChange={onChange}
			disabled={disabled}
			aria-invalid={ariaInvalid}
		>
			{children}
		</select>
	),
	NativeSelectOptGroup: ({ children, label }: { children: React.ReactNode; label: string }) => (
		<optgroup label={label}>{children}</optgroup>
	),
	NativeSelectOption: ({
		children,
		value,
		disabled,
	}: {
		children: React.ReactNode;
		value: string;
		disabled?: boolean;
	}) => (
		<option value={value} disabled={disabled}>
			{children}
		</option>
	),
}));

import { ResponsiveSelect } from "../responsive-select";
import type { ResponsiveSelectOption, ResponsiveSelectGroup } from "../responsive-select";

// ============================================================================
// HELPERS
// ============================================================================

const flatOptions: ResponsiveSelectOption[] = [
	{ value: "bague", label: "Bague" },
	{ value: "collier", label: "Collier" },
	{ value: "bracelet", label: "Bracelet" },
];

const groupedOptions: ResponsiveSelectGroup[] = [
	{
		label: "Bijoux",
		options: [
			{ value: "bague", label: "Bague" },
			{ value: "collier", label: "Collier" },
		],
	},
	{
		label: "Accessoires",
		options: [{ value: "bracelet", label: "Bracelet" }],
	},
];

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("ResponsiveSelect", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ─── Flat options ─────────────────────────────────────────────────────────

	it("renders the native select for mobile", () => {
		render(<ResponsiveSelect options={flatOptions} />);
		expect(screen.getByTestId("native-select")).toBeInTheDocument();
	});

	it("renders the Radix select for desktop", () => {
		render(<ResponsiveSelect options={flatOptions} />);
		expect(screen.getByTestId("radix-select")).toBeInTheDocument();
	});

	it("renders flat option labels in native select", () => {
		render(<ResponsiveSelect options={flatOptions} />);
		const nativeSelect = screen.getByTestId("native-select");
		// All three options should be rendered inside the native select
		expect(nativeSelect.querySelectorAll("option").length).toBe(3);
	});

	it("renders placeholder as disabled option in native select", () => {
		render(<ResponsiveSelect options={flatOptions} placeholder="Sélectionner un type" />);
		const placeholder = screen.getAllByRole("option", {
			name: "Sélectionner un type",
		})[0];
		expect(placeholder).toBeDisabled();
	});

	it("renders flat options in Radix select content", () => {
		render(<ResponsiveSelect options={flatOptions} />);
		expect(screen.getAllByText("Bague").length).toBeGreaterThan(0);
		expect(screen.getAllByText("Collier").length).toBeGreaterThan(0);
		expect(screen.getAllByText("Bracelet").length).toBeGreaterThan(0);
	});

	it("passes value to native select", () => {
		render(<ResponsiveSelect options={flatOptions} value="bague" />);
		const nativeSelect = screen.getByTestId("native-select") as HTMLSelectElement;
		expect(nativeSelect.value).toBe("bague");
	});

	it("passes disabled state to native select", () => {
		render(<ResponsiveSelect options={flatOptions} disabled />);
		const nativeSelect = screen.getByTestId("native-select");
		expect(nativeSelect).toBeDisabled();
	});

	it("passes aria-invalid to native select when set", () => {
		render(<ResponsiveSelect options={flatOptions} aria-invalid={true} />);
		const nativeSelect = screen.getByTestId("native-select");
		expect(nativeSelect).toHaveAttribute("aria-invalid", "true");
	});

	it("sets id on native select", () => {
		render(<ResponsiveSelect options={flatOptions} id="my-select" />);
		expect(screen.getByTestId("native-select")).toHaveAttribute("id", "my-select");
	});

	// ─── Grouped options ──────────────────────────────────────────────────────

	it("renders optgroup labels in native select for grouped options", () => {
		const { container } = render(<ResponsiveSelect options={groupedOptions} />);
		const optgroups = container.querySelectorAll("optgroup");
		expect(optgroups.length).toBe(2);
		expect(optgroups[0]).toHaveAttribute("label", "Bijoux");
		expect(optgroups[1]).toHaveAttribute("label", "Accessoires");
	});

	it("renders group labels in Radix select for grouped options", () => {
		render(<ResponsiveSelect options={groupedOptions} />);
		expect(screen.getAllByText("Bijoux").length).toBeGreaterThan(0);
		expect(screen.getAllByText("Accessoires").length).toBeGreaterThan(0);
	});

	// ─── Disabled option ─────────────────────────────────────────────────────

	it("renders disabled option in native select", () => {
		const withDisabled: ResponsiveSelectOption[] = [
			...flatOptions,
			{ value: "autre", label: "Autre", disabled: true },
		];
		render(<ResponsiveSelect options={withDisabled} />);
		// Target the <option> element specifically (native select)
		const nativeSelect = screen.getByTestId("native-select");
		const disabledOption = nativeSelect.querySelector("option[value='autre']");
		expect(disabledOption).toBeDisabled();
	});
});
