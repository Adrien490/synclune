import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockReducedMotion } = vi.hoisted(() => ({
	mockReducedMotion: { value: false },
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("motion/react", () => {
	const { forwardRef: fRef, createElement } = require("react");
	return {
		AnimatePresence: ({ children }: { children: unknown }) => children,
		m: {
			path: fRef(
				(
					{ d, animate, initial, transition, style, ...props }: Record<string, unknown>,
					ref: unknown,
				) =>
					createElement("path", {
						ref,
						d,
						"data-animate": animate ? JSON.stringify(animate) : undefined,
						...props,
					}),
			),
			g: fRef(
				(
					{
						children,
						initial,
						animate,
						exit,
						transition,
						style,
						...props
					}: Record<string, unknown> & { children?: unknown },
					ref: unknown,
				) => createElement("g", { ref, ...props }, children),
			),
			circle: fRef(
				({ initial, animate, exit, transition, ...props }: Record<string, unknown>, ref: unknown) =>
					createElement("circle", { ref, ...props }),
			),
		},
		useReducedMotion: () => mockReducedMotion.value,
	};
});

vi.mock("@/shared/components/animations/motion.config", () => ({
	MOTION_CONFIG: {
		duration: { normal: 0.2, fast: 0.1 },
		easing: { easeOut: [0, 0, 0.2, 1] },
		spring: { bouncy: { type: "spring", stiffness: 400, damping: 10 } },
	},
}));

// Import AFTER mocks
import { AnimatedHeartIcon } from "../icons/animated-heart-icon";

// ============================================================================
// SETUP
// ============================================================================

beforeEach(() => {
	vi.clearAllMocks();
	mockReducedMotion.value = false;
});

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("AnimatedHeartIcon", () => {
	describe("rendering", () => {
		it("renders an SVG with data-testid='heart-icon'", () => {
			render(<AnimatedHeartIcon />);

			expect(screen.getByTestId("heart-icon")).toBeInTheDocument();
		});

		it("renders with default size 24", () => {
			render(<AnimatedHeartIcon />);
			const svg = screen.getByTestId("heart-icon");

			expect(svg).toHaveAttribute("width", "24");
			expect(svg).toHaveAttribute("height", "24");
		});

		it("renders with custom size", () => {
			render(<AnimatedHeartIcon size={48} />);
			const svg = screen.getByTestId("heart-icon");

			expect(svg).toHaveAttribute("width", "48");
			expect(svg).toHaveAttribute("height", "48");
		});

		it("enforces minimum size of 16px", () => {
			render(<AnimatedHeartIcon size={8} />);
			const svg = screen.getByTestId("heart-icon");

			expect(svg).toHaveAttribute("width", "16");
			expect(svg).toHaveAttribute("height", "16");
		});

		it("forwards className to the SVG", () => {
			render(<AnimatedHeartIcon className="custom-class" />);

			expect(screen.getByTestId("heart-icon")).toHaveClass("custom-class");
		});

		it("sets data-variant='outline' by default", () => {
			render(<AnimatedHeartIcon />);

			expect(screen.getByTestId("heart-icon")).toHaveAttribute("data-variant", "outline");
		});

		it("sets data-variant='filled' when variant is filled", () => {
			render(<AnimatedHeartIcon variant="filled" />);

			expect(screen.getByTestId("heart-icon")).toHaveAttribute("data-variant", "filled");
		});
	});

	describe("accessibility — non-decorative (default)", () => {
		it("has role='img' when not decorative", () => {
			render(<AnimatedHeartIcon />);

			expect(screen.getByRole("img")).toBeInTheDocument();
		});

		it("has default aria-label 'Ajouter aux favoris' for outline variant", () => {
			render(<AnimatedHeartIcon />);

			expect(screen.getByRole("img")).toHaveAttribute("aria-label", "Ajouter aux favoris");
		});

		it("has default aria-label 'Retirer des favoris' for filled variant", () => {
			render(<AnimatedHeartIcon variant="filled" />);

			expect(screen.getByRole("img")).toHaveAttribute("aria-label", "Retirer des favoris");
		});

		it("accepts a custom ariaLabel", () => {
			render(<AnimatedHeartIcon ariaLabel="Favori" />);

			expect(screen.getByRole("img")).toHaveAttribute("aria-label", "Favori");
		});

		it("renders a <title> element with the accessible label", () => {
			const { container } = render(<AnimatedHeartIcon />);

			const title = container.querySelector("title");
			expect(title).toBeInTheDocument();
			expect(title?.textContent).toBe("Ajouter aux favoris");
		});

		it("does not set aria-hidden when not decorative", () => {
			render(<AnimatedHeartIcon />);

			expect(screen.getByTestId("heart-icon")).not.toHaveAttribute("aria-hidden");
		});
	});

	describe("accessibility — decorative", () => {
		it("has role='presentation' attribute when decorative", () => {
			const { container } = render(<AnimatedHeartIcon decorative />);

			expect(container.querySelector("svg")).toHaveAttribute("role", "presentation");
		});

		it("sets aria-hidden='true' when decorative", () => {
			render(<AnimatedHeartIcon decorative />);

			expect(screen.getByTestId("heart-icon")).toHaveAttribute("aria-hidden", "true");
		});

		it("does not render a <title> when decorative", () => {
			const { container } = render(<AnimatedHeartIcon decorative />);

			expect(container.querySelector("title")).not.toBeInTheDocument();
		});

		it("does not set aria-label when decorative", () => {
			render(<AnimatedHeartIcon decorative />);

			expect(screen.getByTestId("heart-icon")).not.toHaveAttribute("aria-label");
		});
	});

	describe("sparkles", () => {
		it("does not render sparkles when variant is outline", () => {
			render(<AnimatedHeartIcon variant="outline" />);

			expect(screen.queryByTestId("heart-sparkles")).not.toBeInTheDocument();
		});

		it("renders sparkles when variant is filled", () => {
			render(<AnimatedHeartIcon variant="filled" />);

			expect(screen.getByTestId("heart-sparkles")).toBeInTheDocument();
		});
	});

	describe("reduced motion behavior", () => {
		it("renders a static SVG when reduced motion is enabled", () => {
			mockReducedMotion.value = true;
			render(<AnimatedHeartIcon />);

			expect(screen.getByTestId("heart-icon")).toBeInTheDocument();
		});

		it("renders sparkles in static SVG when variant is filled and reduced motion is on", () => {
			mockReducedMotion.value = true;
			render(<AnimatedHeartIcon variant="filled" />);

			expect(screen.getByTestId("heart-sparkles")).toBeInTheDocument();
		});

		it("does not render sparkles in static SVG when outline and reduced motion is on", () => {
			mockReducedMotion.value = true;
			render(<AnimatedHeartIcon variant="outline" />);

			expect(screen.queryByTestId("heart-sparkles")).not.toBeInTheDocument();
		});

		it("has role='img' in reduced motion mode when not decorative", () => {
			mockReducedMotion.value = true;
			render(<AnimatedHeartIcon />);

			expect(screen.getByRole("img")).toBeInTheDocument();
		});

		it("has role='presentation' attribute in reduced motion mode when decorative", () => {
			mockReducedMotion.value = true;
			const { container } = render(<AnimatedHeartIcon decorative />);

			expect(container.querySelector("svg")).toHaveAttribute("role", "presentation");
		});

		it("sets correct size in reduced motion mode", () => {
			mockReducedMotion.value = true;
			render(<AnimatedHeartIcon size={32} />);
			const svg = screen.getByTestId("heart-icon");

			expect(svg).toHaveAttribute("width", "32");
			expect(svg).toHaveAttribute("height", "32");
		});
	});
});
