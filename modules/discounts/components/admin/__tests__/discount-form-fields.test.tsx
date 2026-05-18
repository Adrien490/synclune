import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { DiscountFormInstance } from "../../../hooks/use-discount-form";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@/shared/components/ui/card", () => ({
	Card: ({
		children,
		role,
		"aria-label": ariaLabel,
		style,
	}: {
		children: React.ReactNode;
		role?: string;
		"aria-label"?: string;
		style?: React.CSSProperties;
	}) => (
		<section role={role} aria-label={ariaLabel} style={style}>
			{children}
		</section>
	),
	CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
}));

vi.mock("@/shared/components/ui/input-group", () => ({
	InputGroupAddon: ({ children }: { children: React.ReactNode }) => (
		<span data-testid="input-group-addon">{children}</span>
	),
}));

vi.mock("@/shared/components/forms", () => ({
	FieldLabel: ({
		children,
		htmlFor,
		required,
		optional,
	}: {
		children: React.ReactNode;
		htmlFor?: string;
		required?: boolean;
		optional?: boolean;
	}) => (
		<label htmlFor={htmlFor} data-required={required} data-optional={optional}>
			{children}
		</label>
	),
}));

vi.mock("@/modules/discounts/constants/discount.constants", () => ({
	DISCOUNT_TYPE_LABELS: {
		PERCENTAGE: "Pourcentage",
		FIXED_AMOUNT: "Montant fixe",
	},
}));

vi.mock("@/modules/discounts/utils/validate-discount-code-field", () => ({
	validateDiscountCodeField: () => undefined,
}));

// Stub form with helpers reused across all sections.
function buildMockForm(currentType: "PERCENTAGE" | "FIXED_AMOUNT" = "PERCENTAGE", startsAt = "") {
	const renderField = (name: string, render: (field: Record<string, unknown>) => React.ReactNode) =>
		render({
			name,
			state: { value: null, meta: { errors: [] } },
			InputField: ({
				type,
				placeholder,
				description,
			}: {
				type?: string;
				placeholder?: string;
				description?: string;
			}) => (
				<div>
					<input
						data-testid={`field-${name}`}
						type={type}
						placeholder={placeholder as string | undefined}
						aria-describedby={description ? `${name}-desc` : undefined}
					/>
					{description && (
						<p data-testid={`desc-${name}`} id={`${name}-desc`}>
							{description}
						</p>
					)}
				</div>
			),
			InputGroupField: ({
				type,
				placeholder,
				description,
				children,
			}: {
				type?: string;
				placeholder?: string;
				description?: string;
				children?: React.ReactNode;
			}) => (
				<div>
					<input
						data-testid={`field-${name}`}
						type={type}
						placeholder={placeholder as string | undefined}
						aria-describedby={description ? `${name}-desc` : undefined}
					/>
					{children}
					{description && (
						<p data-testid={`desc-${name}`} id={`${name}-desc`}>
							{description}
						</p>
					)}
				</div>
			),
			SelectField: ({
				placeholder,
				"aria-describedby": describedBy,
			}: {
				placeholder?: string;
				"aria-describedby"?: string;
			}) => (
				<select data-testid={`select-${name}`} aria-describedby={describedBy}>
					<option value="">{placeholder}</option>
				</select>
			),
			DateTimeField: ({
				label,
				helpText,
				min,
			}: {
				label?: string;
				helpText?: string;
				min?: string;
			}) => (
				<div>
					<input
						data-testid={`datetime-${name}`}
						type="datetime-local"
						placeholder={label as string | undefined}
						min={min}
					/>
					{helpText && (
						<p data-testid={`help-${name}`} id={`${name}-help`}>
							{helpText}
						</p>
					)}
				</div>
			),
		});

	return {
		AppField: ({
			children,
			name,
		}: {
			children: (field: Record<string, unknown>) => React.ReactNode;
			name: string;
		}) => <>{renderField(name, children)}</>,
		Subscribe: ({
			children,
			selector,
		}: {
			children: (value: unknown) => React.ReactNode;
			selector: (state: Record<string, unknown>) => unknown;
		}) => <>{children(selector({ values: { type: currentType, startsAt } }))}</>,
	} as unknown as DiscountFormInstance;
}

import { DiscountFormFields } from "../discount-form-fields";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("DiscountFormFields", () => {
	it("renders 3 sections with proper aria-labels", () => {
		render(<DiscountFormFields form={buildMockForm()} isPending={false} />);
		expect(screen.getByRole("region", { name: "Code et type de réduction" })).toBeInTheDocument();
		expect(screen.getByRole("region", { name: /Conditions d'utilisation/ })).toBeInTheDocument();
		expect(screen.getByRole("region", { name: "Période de validité" })).toBeInTheDocument();
	});

	it("renders all 8 fields", () => {
		render(<DiscountFormFields form={buildMockForm()} isPending={false} />);
		expect(screen.getByTestId("field-code")).toBeInTheDocument();
		expect(screen.getByTestId("select-type")).toBeInTheDocument();
		expect(screen.getByTestId("field-valueEuros")).toBeInTheDocument();
		expect(screen.getByTestId("field-minOrderAmountEuros")).toBeInTheDocument();
		expect(screen.getByTestId("field-maxUsageCount")).toBeInTheDocument();
		expect(screen.getByTestId("field-maxUsagePerUser")).toBeInTheDocument();
		expect(screen.getByTestId("datetime-startsAt")).toBeInTheDocument();
		expect(screen.getByTestId("datetime-endsAt")).toBeInTheDocument();
	});

	it("renders an InputGroupAddon for valueEuros (% icon by default)", () => {
		render(<DiscountFormFields form={buildMockForm("PERCENTAGE")} isPending={false} />);
		// valueEuros + minOrderAmountEuros both render an addon → at least 2
		const addons = screen.getAllByTestId("input-group-addon");
		expect(addons.length).toBeGreaterThanOrEqual(2);
	});

	it("uses Pourcentage label and 'ex: 10' placeholder when type=PERCENTAGE", () => {
		render(<DiscountFormFields form={buildMockForm("PERCENTAGE")} isPending={false} />);
		expect(screen.getByText("Pourcentage")).toBeInTheDocument();
		expect(screen.getByTestId("field-valueEuros")).toHaveAttribute("placeholder", "ex: 10");
	});

	it("switches to Montant fixe label and 'ex: 10.00' placeholder when type=FIXED_AMOUNT", () => {
		render(<DiscountFormFields form={buildMockForm("FIXED_AMOUNT")} isPending={false} />);
		expect(screen.getByText("Montant fixe")).toBeInTheDocument();
		expect(screen.getByTestId("field-valueEuros")).toHaveAttribute("placeholder", "ex: 10.00");
	});

	it("links helper text to fields via aria-describedby", () => {
		render(<DiscountFormFields form={buildMockForm()} isPending={false} />);
		const codeField = screen.getByTestId("field-code");
		expect(codeField).toHaveAttribute("aria-describedby", "code-desc");
		expect(screen.getByTestId("desc-code")).toHaveAttribute("id", "code-desc");

		const maxUsageCountField = screen.getByTestId("field-maxUsageCount");
		expect(maxUsageCountField).toHaveAttribute("aria-describedby", "maxUsageCount-desc");
	});

	it("propagates min attribute from startsAt to endsAt for client-level guard", () => {
		const startsAt = "2026-06-01T10:00";
		render(<DiscountFormFields form={buildMockForm("PERCENTAGE", startsAt)} isPending={false} />);
		expect(screen.getByTestId("datetime-endsAt")).toHaveAttribute("min", startsAt);
	});

	it("renders code section with viewTransitionName", () => {
		render(<DiscountFormFields form={buildMockForm()} isPending={false} />);
		const codeRegion = screen.getByRole("region", { name: "Code et type de réduction" });
		expect(codeRegion).toHaveStyle({ viewTransitionName: "discount-code-section" });
	});
});
