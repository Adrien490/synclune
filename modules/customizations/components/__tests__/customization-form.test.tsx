import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockAction, mockCaptureFormValues } = vi.hoisted(() => ({
	mockAction: vi.fn(),
	mockCaptureFormValues: vi.fn(),
}));

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

vi.mock("@/modules/customizations/hooks/use-customization-form", () => ({
	useCustomizationForm: () => ({
		form: {
			state: {
				isDirty: false,
				isValid: true,
				values: { inspirationMedias: [], deletedImageUrls: [] },
			},
			AppField: ({
				children,
				name: _name,
			}: {
				children: (field: {
					state: { value: string; meta: { errors: string[] } };
					handleChange: (v: string) => void;
					InputField: (props: {
						label: string;
						required?: boolean;
						[key: string]: unknown;
					}) => React.ReactNode;
					TextareaField: (props: {
						label: string;
						required?: boolean;
						[key: string]: unknown;
					}) => React.ReactNode;
					PhoneField: (props: {
						label: string;
						optional?: boolean;
						[key: string]: unknown;
					}) => React.ReactNode;
				}) => React.ReactNode;
				name: string;
			}) =>
				children({
					state: { value: "", meta: { errors: [] } },
					handleChange: vi.fn(),
					InputField: ({ label, required }: { label: string; required?: boolean }) => (
						<div>
							<label>
								{label}
								{required && " *"}
							</label>
							<input type="text" aria-label={label} />
						</div>
					),
					TextareaField: ({ label, required }: { label: string; required?: boolean }) => (
						<div>
							<label>
								{label}
								{required && " *"}
							</label>
							<textarea aria-label={label} />
						</div>
					),
					PhoneField: ({ label }: { label: string }) => (
						<div>
							<label>{label}</label>
							<input type="tel" aria-label={label} />
						</div>
					),
				}),
			Subscribe: ({
				children,
				selector,
			}: {
				children: (value: unknown) => React.ReactNode;
				selector: (state: {
					values: {
						inspirationMedias: unknown[];
						deletedImageUrls: string[];
						[key: string]: unknown;
					};
				}) => unknown;
			}) => {
				const value = selector({
					values: { inspirationMedias: [], deletedImageUrls: [], productTypeLabel: "" },
				});
				return <>{children(value)}</>;
			},
			setFieldValue: vi.fn(),
			getFieldValue: vi.fn(() => []),
		},
		action: mockAction,
		isPending: false,
		isSubmitted: false,
		submittedData: null,
		captureFormValues: mockCaptureFormValues,
	}),
}));

vi.mock("@/shared/hooks/use-unsaved-changes", () => ({
	useUnsavedChanges: vi.fn(),
}));

vi.mock("motion/react", () => ({
	AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	motion: {
		form: ({
			children,
			action,
			"aria-busy": ariaBusy,
			...rest
		}: {
			children: React.ReactNode;
			action?: (fd: FormData) => void;
			"aria-busy"?: boolean;
			[key: string]: unknown;
		}) => (
			<form action={action as unknown as string} aria-busy={ariaBusy} {...rest}>
				{children}
			</form>
		),
	},
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		disabled,
		"aria-busy": ariaBusy,
		type,
		size,
		className,
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		"aria-busy"?: boolean;
		type?: string;
		size?: string;
		className?: string;
	}) => (
		<button
			type={type as "submit" | "button"}
			disabled={disabled}
			aria-busy={ariaBusy}
			className={className}
			data-size={size}
		>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/required-fields-note", () => ({
	RequiredFieldsNote: () => <p data-testid="required-fields-note">* champs obligatoires</p>,
}));

vi.mock("@/modules/customizations/components/responsive-select", () => ({
	ResponsiveSelect: ({
		placeholder,
	}: {
		options: unknown[];
		placeholder?: string;
		[key: string]: unknown;
	}) => <div data-testid="responsive-select">{placeholder}</div>,
}));

vi.mock("@/modules/customizations/components/customization-submission-success", () => ({
	CustomizationSubmissionSuccess: () => <div data-testid="submission-success">Succès</div>,
}));

vi.mock("@/modules/customizations/components/inspiration-media-upload", () => ({
	InspirationMediaUpload: () => <div data-testid="inspiration-media-upload" />,
}));

vi.mock("@/shared/components/forms", () => ({
	FieldLabel: ({
		children,
		optional,
	}: {
		children: React.ReactNode;
		htmlFor?: string;
		optional?: boolean;
	}) => (
		<label>
			{children}
			{optional && <span> (optionnel)</span>}
		</label>
	),
}));

import React from "react";
import { CustomizationForm } from "../customization-form";
import type { ProductType } from "../../types/customization.types";

// ============================================================================
// HELPERS
// ============================================================================

const productTypes: ProductType[] = [
	{ id: "1", label: "Bague", slug: "bague" },
	{ id: "2", label: "Collier", slug: "collier" },
];

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("CustomizationForm", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ─── Basic rendering ──────────────────────────────────────────────────────

	it("renders the form element", () => {
		const { container } = render(<CustomizationForm productTypes={productTypes} />);
		expect(container.querySelector("form")).toBeInTheDocument();
	});

	it("renders the required fields note", () => {
		render(<CustomizationForm productTypes={productTypes} />);
		expect(screen.getByTestId("required-fields-note")).toBeInTheDocument();
	});

	it("renders the product type select", () => {
		render(<CustomizationForm productTypes={productTypes} />);
		expect(screen.getByTestId("responsive-select")).toBeInTheDocument();
	});

	it("renders the details textarea field label", () => {
		render(<CustomizationForm productTypes={productTypes} />);
		expect(screen.getByText(/Décrivez votre projet/)).toBeInTheDocument();
	});

	it("renders the inspiration media upload", () => {
		render(<CustomizationForm productTypes={productTypes} />);
		expect(screen.getByTestId("inspiration-media-upload")).toBeInTheDocument();
	});

	it("renders the first name input field label", () => {
		render(<CustomizationForm productTypes={productTypes} />);
		expect(screen.getByText(/Prénom/)).toBeInTheDocument();
	});

	it("renders the email input field label", () => {
		render(<CustomizationForm productTypes={productTypes} />);
		expect(screen.getByText(/Adresse email/)).toBeInTheDocument();
	});

	it("renders the phone field label", () => {
		render(<CustomizationForm productTypes={productTypes} />);
		expect(screen.getByText("Téléphone")).toBeInTheDocument();
	});

	it("renders the submit button", () => {
		render(<CustomizationForm productTypes={productTypes} />);
		expect(screen.getByRole("button", { name: "Envoyer mon message" })).toBeInTheDocument();
	});

	it("renders the honeypot field as hidden", () => {
		const { container } = render(<CustomizationForm productTypes={productTypes} />);
		const honeypot = container.querySelector('input[name="website"]');
		expect(honeypot).toBeInTheDocument();
		expect(honeypot).toHaveAttribute("type", "text");
		expect(honeypot).toHaveAttribute("tabindex", "-1");
		expect(honeypot).toHaveAttribute("aria-hidden", "true");
	});

	it("renders 'Type de bijou' label as optional", () => {
		render(<CustomizationForm productTypes={productTypes} />);
		expect(screen.getByText("Type de bijou")).toBeInTheDocument();
	});
});
