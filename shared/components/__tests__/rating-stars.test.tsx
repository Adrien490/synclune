import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) =>
		args
			.flat()
			.filter((a) => typeof a === "string" && a.length > 0)
			.join(" "),
}));

vi.mock("@/shared/components/icons/star-icon", () => {
	const { createElement } = require("react");
	return {
		StarIcon: ({ fillPercentage, gradientId, ...props }: Record<string, unknown>) =>
			createElement("svg", {
				"data-testid": `star-${gradientId}`,
				"data-fill": String(fillPercentage),
				...props,
			}),
	};
});

// Import AFTER mocks
import { RatingStars } from "../rating-stars";

// ============================================================================
// SETUP
// ============================================================================

beforeEach(() => {
	vi.clearAllMocks();
});

afterEach(cleanup);

// ============================================================================
// TESTS — DISPLAY MODE
// ============================================================================

describe("RatingStars", () => {
	describe("display mode", () => {
		it("renders with role='meter' in display mode", () => {
			render(<RatingStars rating={4} />);

			expect(screen.getByRole("meter")).toBeInTheDocument();
		});

		it("sets aria-valuenow to the rating", () => {
			render(<RatingStars rating={3.5} />);

			const meter = screen.getByRole("meter");
			expect(meter).toHaveAttribute("aria-valuenow", "3.5");
		});

		it("sets aria-valuemin=0 and aria-valuemax to maxRating", () => {
			render(<RatingStars rating={2} maxRating={10} />);

			const meter = screen.getByRole("meter");
			expect(meter).toHaveAttribute("aria-valuemin", "0");
			expect(meter).toHaveAttribute("aria-valuemax", "10");
		});

		it("generates default aria-label with French decimal format", () => {
			render(<RatingStars rating={4.3} />);

			const meter = screen.getByRole("meter");
			expect(meter).toHaveAttribute("aria-label", "Note : 4,3 sur 5");
		});

		it("uses custom ariaLabel when provided", () => {
			render(<RatingStars rating={4} ariaLabel="Qualité du produit" />);

			expect(screen.getByRole("meter")).toHaveAttribute("aria-label", "Qualité du produit");
		});

		it("renders 5 stars by default", () => {
			const { container } = render(<RatingStars rating={3} />);

			const stars = container.querySelectorAll("svg");
			expect(stars).toHaveLength(5);
		});

		it("renders correct number of stars for custom maxRating", () => {
			const { container } = render(<RatingStars rating={3} maxRating={10} />);

			const stars = container.querySelectorAll("svg");
			expect(stars).toHaveLength(10);
		});

		it("calculates fill percentages correctly for rating=4.3", () => {
			const { container } = render(<RatingStars rating={4.3} />);

			const stars = container.querySelectorAll("svg");
			// Stars 1-4 should be fully filled (1)
			expect(stars[0]).toHaveAttribute("data-fill", "1");
			expect(stars[1]).toHaveAttribute("data-fill", "1");
			expect(stars[2]).toHaveAttribute("data-fill", "1");
			expect(stars[3]).toHaveAttribute("data-fill", "1");
			// Star 5 should be 0.3 (partial)
			const fifthFill = parseFloat(stars[4]!.getAttribute("data-fill")!);
			expect(fifthFill).toBeCloseTo(0.3, 1);
		});

		it("calculates fill percentages correctly for rating=0", () => {
			const { container } = render(<RatingStars rating={0} />);

			const stars = container.querySelectorAll("svg");
			for (const star of stars) {
				expect(star).toHaveAttribute("data-fill", "0");
			}
		});

		it("shows rating text in French format when showRating is true", () => {
			render(<RatingStars rating={4.5} showRating />);

			expect(screen.getByText("4,5")).toBeInTheDocument();
		});

		it("does not show rating text when showRating is false", () => {
			render(<RatingStars rating={4.5} />);

			expect(screen.queryByText("4,5")).not.toBeInTheDocument();
		});

		it("applies custom className", () => {
			render(<RatingStars rating={3} className="my-class" />);

			expect(screen.getByRole("meter")).toHaveClass("my-class");
		});
	});

	// ============================================================================
	// TESTS — INTERACTIVE MODE
	// ============================================================================

	describe("interactive mode", () => {
		it("renders with role='radiogroup' in interactive mode", () => {
			render(<RatingStars rating={3} interactive onChange={vi.fn()} />);

			expect(screen.getByRole("radiogroup")).toBeInTheDocument();
		});

		it("has default aria-label for interactive mode", () => {
			render(<RatingStars rating={3} interactive onChange={vi.fn()} />);

			expect(screen.getByRole("radiogroup")).toHaveAttribute("aria-label", "Sélection de la note");
		});

		it("does not set aria-valuenow in interactive mode", () => {
			render(<RatingStars rating={3} interactive onChange={vi.fn()} />);

			expect(screen.getByRole("radiogroup")).not.toHaveAttribute("aria-valuenow");
		});

		it("renders radio buttons for each star", () => {
			render(<RatingStars rating={3} interactive onChange={vi.fn()} />);

			const radios = screen.getAllByRole("radio");
			expect(radios).toHaveLength(5);
		});

		it("marks the selected star as aria-checked", () => {
			render(<RatingStars rating={3} interactive onChange={vi.fn()} />);

			const radios = screen.getAllByRole("radio");
			expect(radios[2]).toHaveAttribute("aria-checked", "true");
			expect(radios[0]).toHaveAttribute("aria-checked", "false");
			expect(radios[4]).toHaveAttribute("aria-checked", "false");
		});

		it("calls onChange when a star is clicked", () => {
			const onChange = vi.fn();
			render(<RatingStars rating={1} interactive onChange={onChange} />);

			fireEvent.click(screen.getAllByRole("radio")[3]!);
			expect(onChange).toHaveBeenCalledWith(4);
		});

		it("sets aria-required when required is true", () => {
			render(<RatingStars rating={0} interactive onChange={vi.fn()} required />);

			expect(screen.getByRole("radiogroup")).toHaveAttribute("aria-required", "true");
		});

		it("disables all stars when disabled is true", () => {
			render(<RatingStars rating={2} interactive onChange={vi.fn()} disabled />);

			const radios = screen.getAllByRole("radio");
			for (const radio of radios) {
				expect(radio).toBeDisabled();
			}
		});

		it("does not call onChange when disabled", () => {
			const onChange = vi.fn();
			render(<RatingStars rating={2} interactive onChange={onChange} disabled />);

			fireEvent.click(screen.getAllByRole("radio")[4]!);
			expect(onChange).not.toHaveBeenCalled();
		});

		it("passes aria-invalid to the container", () => {
			render(<RatingStars rating={0} interactive onChange={vi.fn()} aria-invalid={true} />);

			expect(screen.getByRole("radiogroup")).toHaveAttribute("aria-invalid", "true");
		});

		it("passes aria-describedby to the container", () => {
			render(
				<RatingStars rating={0} interactive onChange={vi.fn()} aria-describedby="error-msg" />,
			);

			expect(screen.getByRole("radiogroup")).toHaveAttribute("aria-describedby", "error-msg");
		});

		it("labels each star with its number", () => {
			render(<RatingStars rating={1} interactive onChange={vi.fn()} />);

			expect(screen.getByRole("radio", { name: "1 étoile" })).toBeInTheDocument();
			expect(screen.getByRole("radio", { name: "2 étoiles" })).toBeInTheDocument();
			expect(screen.getByRole("radio", { name: "5 étoiles" })).toBeInTheDocument();
		});
	});

	// ============================================================================
	// TESTS — KEYBOARD NAVIGATION
	// ============================================================================

	describe("keyboard navigation", () => {
		it("selects star on Enter key", () => {
			const onChange = vi.fn();
			render(<RatingStars rating={1} interactive onChange={onChange} />);

			fireEvent.keyDown(screen.getAllByRole("radio")[2]!, { key: "Enter" });
			expect(onChange).toHaveBeenCalledWith(3);
		});

		it("selects star on Space key", () => {
			const onChange = vi.fn();
			render(<RatingStars rating={1} interactive onChange={onChange} />);

			fireEvent.keyDown(screen.getAllByRole("radio")[4]!, { key: " " });
			expect(onChange).toHaveBeenCalledWith(5);
		});

		it("navigates right with ArrowRight and selects next star", () => {
			const onChange = vi.fn();
			render(<RatingStars rating={2} interactive onChange={onChange} />);

			fireEvent.keyDown(screen.getAllByRole("radio")[1]!, { key: "ArrowRight" });
			expect(onChange).toHaveBeenCalledWith(3);
		});

		it("navigates left with ArrowLeft and selects previous star", () => {
			const onChange = vi.fn();
			render(<RatingStars rating={3} interactive onChange={onChange} />);

			fireEvent.keyDown(screen.getAllByRole("radio")[2]!, { key: "ArrowLeft" });
			expect(onChange).toHaveBeenCalledWith(2);
		});

		it("does not go beyond maxRating with ArrowRight", () => {
			const onChange = vi.fn();
			render(<RatingStars rating={5} interactive onChange={onChange} />);

			fireEvent.keyDown(screen.getAllByRole("radio")[4]!, { key: "ArrowRight" });
			expect(onChange).not.toHaveBeenCalled();
		});

		it("does not go below 1 with ArrowLeft", () => {
			const onChange = vi.fn();
			render(<RatingStars rating={1} interactive onChange={onChange} />);

			fireEvent.keyDown(screen.getAllByRole("radio")[0]!, { key: "ArrowLeft" });
			expect(onChange).not.toHaveBeenCalled();
		});
	});
});
