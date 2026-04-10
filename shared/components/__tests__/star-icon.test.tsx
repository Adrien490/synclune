import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";

// Import AFTER (no mocks needed — pure SVG component)
import { StarIcon } from "../icons/star-icon";

// ============================================================================
// SETUP
// ============================================================================

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("StarIcon", () => {
	describe("rendering", () => {
		it("renders an SVG element", () => {
			const { container } = render(
				<StarIcon fillPercentage={1} size="md" gradientId="test-gradient" />,
			);

			expect(container.querySelector("svg")).toBeInTheDocument();
		});

		it("has the correct viewBox (0 0 24 24)", () => {
			const { container } = render(<StarIcon fillPercentage={0.5} size="md" gradientId="grad" />);

			expect(container.querySelector("svg")).toHaveAttribute("viewBox", "0 0 24 24");
		});

		it("renders a <path> with the star shape", () => {
			const { container } = render(<StarIcon fillPercentage={1} size="md" gradientId="grad" />);

			expect(container.querySelector("path")).toBeInTheDocument();
		});
	});

	describe("accessibility", () => {
		it("is aria-hidden (decorative — rating group provides label)", () => {
			const { container } = render(<StarIcon fillPercentage={1} size="md" gradientId="grad" />);

			expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
		});

		it("has focusable='false' to prevent tab focus in IE", () => {
			const { container } = render(<StarIcon fillPercentage={1} size="md" gradientId="grad" />);

			expect(container.querySelector("svg")).toHaveAttribute("focusable", "false");
		});
	});

	describe("size classes", () => {
		it("applies size-[18px] class for size='sm'", () => {
			const { container } = render(<StarIcon fillPercentage={1} size="sm" gradientId="grad" />);

			expect(container.querySelector("svg")).toHaveClass("size-[18px]");
		});

		it("applies size-5 class for size='md'", () => {
			const { container } = render(<StarIcon fillPercentage={1} size="md" gradientId="grad" />);

			expect(container.querySelector("svg")).toHaveClass("size-5");
		});

		it("applies size-6 class for size='lg'", () => {
			const { container } = render(<StarIcon fillPercentage={1} size="lg" gradientId="grad" />);

			expect(container.querySelector("svg")).toHaveClass("size-6");
		});
	});

	describe("fill — fully filled (fillPercentage >= 1)", () => {
		it("fills path with var(--star-filled) when fillPercentage=1", () => {
			const { container } = render(<StarIcon fillPercentage={1} size="md" gradientId="grad" />);

			expect(container.querySelector("path")).toHaveAttribute("fill", "var(--star-filled)");
		});

		it("fills path with var(--star-filled) when fillPercentage > 1 (clamped)", () => {
			const { container } = render(<StarIcon fillPercentage={2} size="md" gradientId="grad" />);

			expect(container.querySelector("path")).toHaveAttribute("fill", "var(--star-filled)");
		});

		it("does not render a linearGradient when fully filled", () => {
			const { container } = render(<StarIcon fillPercentage={1} size="md" gradientId="grad" />);

			expect(container.querySelector("linearGradient")).not.toBeInTheDocument();
		});
	});

	describe("fill — empty (fillPercentage <= 0)", () => {
		it("fills path with var(--star-empty) when fillPercentage=0", () => {
			const { container } = render(<StarIcon fillPercentage={0} size="md" gradientId="grad" />);

			expect(container.querySelector("path")).toHaveAttribute("fill", "var(--star-empty)");
		});

		it("fills path with var(--star-empty) when fillPercentage < 0", () => {
			const { container } = render(<StarIcon fillPercentage={-0.5} size="md" gradientId="grad" />);

			expect(container.querySelector("path")).toHaveAttribute("fill", "var(--star-empty)");
		});

		it("does not render a linearGradient when empty", () => {
			const { container } = render(<StarIcon fillPercentage={0} size="md" gradientId="grad" />);

			expect(container.querySelector("linearGradient")).not.toBeInTheDocument();
		});
	});

	describe("fill — partial (0 < fillPercentage < 1)", () => {
		it("fills path with a url() gradient reference when partial", () => {
			const { container } = render(
				<StarIcon fillPercentage={0.5} size="md" gradientId="star-grad-1" />,
			);

			expect(container.querySelector("path")).toHaveAttribute("fill", "url(#star-grad-1)");
		});

		it("renders a <linearGradient> element for partial fill", () => {
			const { container } = render(
				<StarIcon fillPercentage={0.5} size="md" gradientId="star-grad-1" />,
			);

			expect(container.querySelector("linearGradient")).toBeInTheDocument();
		});

		it("linearGradient has the id matching gradientId prop", () => {
			const { container } = render(
				<StarIcon fillPercentage={0.7} size="md" gradientId="my-grad" />,
			);

			expect(container.querySelector("linearGradient")).toHaveAttribute("id", "my-grad");
		});

		it("first gradient stop offset matches fillPercentage (50% for 0.5)", () => {
			const { container } = render(<StarIcon fillPercentage={0.5} size="md" gradientId="g" />);
			const stops = container.querySelectorAll("stop");

			expect(stops[0]).toHaveAttribute("offset", "50%");
		});

		it("second gradient stop offset matches fillPercentage (50% for 0.5)", () => {
			const { container } = render(<StarIcon fillPercentage={0.5} size="md" gradientId="g" />);
			const stops = container.querySelectorAll("stop");

			expect(stops[1]).toHaveAttribute("offset", "50%");
		});

		it("first stop has stopColor var(--star-filled)", () => {
			const { container } = render(<StarIcon fillPercentage={0.3} size="md" gradientId="g" />);
			const stops = container.querySelectorAll("stop");

			expect(stops[0]).toHaveAttribute("stop-color", "var(--star-filled)");
		});

		it("second stop has stopColor var(--star-empty)", () => {
			const { container } = render(<StarIcon fillPercentage={0.3} size="md" gradientId="g" />);
			const stops = container.querySelectorAll("stop");

			expect(stops[1]).toHaveAttribute("stop-color", "var(--star-empty)");
		});

		it("renders two <stop> elements inside the gradient", () => {
			const { container } = render(<StarIcon fillPercentage={0.75} size="md" gradientId="g" />);

			expect(container.querySelectorAll("stop")).toHaveLength(2);
		});

		it("calculates 75% offset correctly for fillPercentage=0.75", () => {
			const { container } = render(<StarIcon fillPercentage={0.75} size="md" gradientId="g" />);
			const stops = container.querySelectorAll("stop");

			expect(stops[0]).toHaveAttribute("offset", "75%");
		});
	});

	describe("gradientId uniqueness", () => {
		it("uses the provided gradientId as the fill URL", () => {
			const { container } = render(
				<StarIcon fillPercentage={0.4} size="sm" gradientId="unique-id-42" />,
			);

			expect(container.querySelector("path")).toHaveAttribute("fill", "url(#unique-id-42)");
		});

		it("uses the provided gradientId as the linearGradient id attribute", () => {
			const { container } = render(
				<StarIcon fillPercentage={0.4} size="sm" gradientId="unique-id-42" />,
			);

			expect(container.querySelector("linearGradient")).toHaveAttribute("id", "unique-id-42");
		});
	});
});
