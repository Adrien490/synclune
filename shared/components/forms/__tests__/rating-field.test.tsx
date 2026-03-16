import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/shared/components/ui/field", () => ({
	Field: ({ children, ...props }: any) => <div {...props}>{children}</div>,
	FieldError: ({ errors }: any) =>
		errors?.length > 0 ? <div role="alert">{errors[0]?.message ?? errors[0]}</div> : null,
}));

vi.mock("../field-label", () => ({
	FieldLabel: ({ children, required }: any) => (
		<label>
			{children}
			{required && <span aria-hidden="true">*</span>}
		</label>
	),
}));

// Mock RatingStars with interactive buttons we can test
vi.mock("@/shared/components/rating-stars", () => ({
	RatingStars: ({ rating, interactive, onChange, "aria-invalid": ariaInvalid }: any) => (
		<div
			role="radiogroup"
			aria-label="Sélection de la note"
			aria-invalid={ariaInvalid}
			data-testid="rating-stars"
		>
			{[1, 2, 3, 4, 5].map((star) => (
				<button
					key={star}
					type="button"
					role="radio"
					aria-checked={star === rating}
					data-star={star}
					onClick={() => interactive && onChange?.(star)}
					onMouseEnter={() => {}}
					onMouseLeave={() => {}}
					aria-label={`${star} étoile${star > 1 ? "s" : ""}`}
				>
					{star}
				</button>
			))}
		</div>
	),
}));

// ============================================================================
// FORM CONTEXT MOCK
// ============================================================================

const mockHandleChange = vi.fn();

const createFieldState = (value: number, errors: any[] = []) => ({
	state: { value, meta: { errors } },
	name: "rating",
	handleChange: mockHandleChange,
	handleBlur: vi.fn(),
});

vi.mock("@/shared/lib/form-context", () => ({
	useFieldContext: vi.fn(),
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { RatingField } from "../rating-field";
import { useFieldContext } from "@/shared/lib/form-context";

const mockUseFieldContext = vi.mocked(useFieldContext);

// ============================================================================
// TESTS
// ============================================================================

describe("RatingField", () => {
	afterEach(() => {
		cleanup();
		mockHandleChange.mockClear();
	});

	// ============================================================================
	// RENDERING
	// ============================================================================

	it("renders the RatingStars component", () => {
		mockUseFieldContext.mockReturnValue(createFieldState(0) as any);
		render(<RatingField />);
		expect(screen.getByTestId("rating-stars")).toBeInTheDocument();
	});

	it("renders 5 star buttons", () => {
		mockUseFieldContext.mockReturnValue(createFieldState(0) as any);
		render(<RatingField />);
		const radios = screen.getAllByRole("radio");
		expect(radios).toHaveLength(5);
	});

	it("renders label when provided", () => {
		mockUseFieldContext.mockReturnValue(createFieldState(0) as any);
		render(<RatingField label="Votre note" />);
		expect(screen.getByText("Votre note")).toBeInTheDocument();
	});

	// ============================================================================
	// CLICK SELECTION
	// ============================================================================

	it("calls handleChange with star value when a star is clicked", () => {
		mockUseFieldContext.mockReturnValue(createFieldState(0) as any);
		render(<RatingField />);
		fireEvent.click(screen.getByRole("radio", { name: "3 étoiles" }));
		expect(mockHandleChange).toHaveBeenCalledWith(3);
	});

	it("calls handleChange with 1 when first star is clicked", () => {
		mockUseFieldContext.mockReturnValue(createFieldState(0) as any);
		render(<RatingField />);
		fireEvent.click(screen.getByRole("radio", { name: "1 étoile" }));
		expect(mockHandleChange).toHaveBeenCalledWith(1);
	});

	// ============================================================================
	// CURRENT SELECTION REFLECTED
	// ============================================================================

	it("marks the correct star as aria-checked when rating is set", () => {
		mockUseFieldContext.mockReturnValue(createFieldState(4) as any);
		render(<RatingField />);
		const fourthStar = screen.getByRole("radio", { name: "4 étoiles" });
		expect(fourthStar).toHaveAttribute("aria-checked", "true");
	});

	it("marks other stars as not aria-checked", () => {
		mockUseFieldContext.mockReturnValue(createFieldState(4) as any);
		render(<RatingField />);
		const thirdStar = screen.getByRole("radio", { name: "3 étoiles" });
		expect(thirdStar).toHaveAttribute("aria-checked", "false");
	});

	// ============================================================================
	// ZERO / EMPTY RATING
	// ============================================================================

	it("renders rating text showing 0 étoile when value is 0", () => {
		mockUseFieldContext.mockReturnValue(createFieldState(0) as any);
		render(<RatingField showRatingText />);
		expect(screen.getByText("0 étoile")).toBeInTheDocument();
	});

	it("renders rating text with plural when value is > 1", () => {
		mockUseFieldContext.mockReturnValue(createFieldState(3) as any);
		render(<RatingField showRatingText />);
		expect(screen.getByText("3 étoiles")).toBeInTheDocument();
	});

	// ============================================================================
	// ERROR STATE
	// ============================================================================

	it("renders error message when field has errors", () => {
		mockUseFieldContext.mockReturnValue(createFieldState(0, [{ message: "Note requise" }]) as any);
		render(<RatingField />);
		expect(screen.getByRole("alert")).toHaveTextContent("Note requise");
	});

	it("sets aria-invalid on rating group when there are errors", () => {
		mockUseFieldContext.mockReturnValue(createFieldState(0, [{ message: "Note requise" }]) as any);
		render(<RatingField />);
		const radiogroup = screen.getByRole("radiogroup");
		expect(radiogroup).toHaveAttribute("aria-invalid", "true");
	});

	// ============================================================================
	// HIDDEN INPUT
	// ============================================================================

	it("renders hidden input with current rating value", () => {
		mockUseFieldContext.mockReturnValue(createFieldState(5) as any);
		const { container } = render(<RatingField />);
		const hidden = container.querySelector('input[type="hidden"]') as HTMLInputElement;
		expect(hidden).toBeInTheDocument();
		expect(hidden.value).toBe("5");
	});
});
