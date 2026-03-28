import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({}));

vi.mock("@/shared/lib/form-context", () => ({
	useFieldContext: () => ({
		name: "media",
		state: {
			value: [],
			meta: { errors: [] },
		},
		handleChange: vi.fn(),
	}),
}));

vi.mock("@/shared/components/ui/field", () => ({
	Field: ({
		children,
		"data-invalid": dataInvalid,
	}: {
		children: React.ReactNode;
		"data-invalid"?: boolean;
		className?: string;
	}) => (
		<div data-testid="field" data-invalid={dataInvalid}>
			{children}
		</div>
	),
	FieldError: ({ errors }: { errors: string[]; id?: string }) =>
		errors.length > 0 ? <p data-testid="field-error">{errors[0]}</p> : null,
}));

vi.mock("@/shared/components/forms/field-label", () => ({
	FieldLabel: ({
		children,
		optional,
	}: {
		children: React.ReactNode;
		htmlFor?: string;
		optional?: boolean;
	}) => (
		<label data-testid="field-label" data-optional={optional}>
			{children}
		</label>
	),
}));

vi.mock("../review-media-upload", () => ({
	ReviewMediaUpload: ({
		media,
		disabled,
	}: {
		media: unknown[];
		onChange: (media: unknown[]) => void;
		onMediaRemoved?: (url: string) => void;
		disabled?: boolean;
	}) => (
		<div data-testid="review-media-upload" data-count={media.length} data-disabled={disabled} />
	),
}));

vi.mock("next/dynamic", () => ({
	default: (fn: () => Promise<unknown>) => {
		void fn();
		return ({
			media,
			disabled,
		}: {
			media: unknown[];
			onChange: (media: unknown[]) => void;
			disabled?: boolean;
		}) => (
			<div data-testid="review-media-upload" data-count={media.length} data-disabled={disabled} />
		);
	},
}));

import { ReviewMediaField } from "../review-media-field";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("ReviewMediaField", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders without error", () => {
		render(<ReviewMediaField />);
		expect(screen.getByTestId("field")).toBeInTheDocument();
	});

	it("renders label when label prop is provided", () => {
		render(<ReviewMediaField label="Photos" />);
		expect(screen.getByTestId("field-label")).toBeInTheDocument();
		expect(screen.getByText("Photos")).toBeInTheDocument();
	});

	it("does not render label when label prop is not provided", () => {
		render(<ReviewMediaField />);
		expect(screen.queryByTestId("field-label")).toBeNull();
	});

	it("renders the media upload component", () => {
		render(<ReviewMediaField label="Photos" />);
		expect(screen.getByTestId("review-media-upload")).toBeInTheDocument();
	});

	it("renders hidden input with field name", () => {
		render(<ReviewMediaField />);
		const hiddenInput = document.querySelector('input[type="hidden"][name="media"]');
		expect(hiddenInput).not.toBeNull();
	});
});
