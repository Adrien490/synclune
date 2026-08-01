import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) =>
		args
			.flat()
			.filter((a) => typeof a === "string" && a.length > 0)
			.join(" "),
}));

vi.mock("motion/react", () => ({
	// `MiniDotsLoader` gate désormais son animation sur `prefers-reduced-motion`.
	useReducedMotion: () => false,
	m: {
		div: ({
			children,
			className,
			role,
			"aria-label": ariaLabel,
			...rest
		}: React.ComponentProps<"div"> & { "aria-label"?: string }) => (
			<div role={role} aria-label={ariaLabel} className={className} {...rest}>
				{children}
			</div>
		),
		span: ({ children, className, ...rest }: React.ComponentProps<"span">) => (
			<span className={className} {...rest}>
				{children}
			</span>
		),
	},
}));

// Import AFTER mocks
import { MiniDotsLoader } from "../mini-dots-loader";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("MiniDotsLoader", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders with role=status", () => {
		render(<MiniDotsLoader />);
		expect(screen.getByRole("status")).toBeInTheDocument();
	});

	it("has aria-label='Chargement en cours'", () => {
		render(<MiniDotsLoader />);
		expect(screen.getByRole("status")).toHaveAttribute("aria-label", "Chargement en cours");
	});

	it("renders 3 dots", () => {
		const { container } = render(<MiniDotsLoader />);
		const dots = container.querySelectorAll("span");
		expect(dots).toHaveLength(3);
	});

	it("applies sm size class by default", () => {
		const { container } = render(<MiniDotsLoader />);
		const dots = container.querySelectorAll("span");
		for (const dot of dots) {
			expect(dot.className).toContain("size-1");
		}
	});

	it("applies xs size class", () => {
		const { container } = render(<MiniDotsLoader size="xs" />);
		const dots = container.querySelectorAll("span");
		for (const dot of dots) {
			expect(dot.className).toContain("size-0.5");
		}
	});

	it("applies md size class", () => {
		const { container } = render(<MiniDotsLoader size="md" />);
		const dots = container.querySelectorAll("span");
		for (const dot of dots) {
			expect(dot.className).toContain("size-1.5");
		}
	});

	it("applies lg size class", () => {
		const { container } = render(<MiniDotsLoader size="lg" />);
		const dots = container.querySelectorAll("span");
		for (const dot of dots) {
			expect(dot.className).toContain("size-2");
		}
	});

	it("applies xl size class", () => {
		const { container } = render(<MiniDotsLoader size="xl" />);
		const dots = container.querySelectorAll("span");
		for (const dot of dots) {
			expect(dot.className).toContain("size-2.5");
		}
	});

	it("applies primary color class by default", () => {
		const { container } = render(<MiniDotsLoader />);
		const dots = container.querySelectorAll("span");
		for (const dot of dots) {
			expect(dot.className).toContain("bg-primary");
		}
	});

	it("applies destructive color class", () => {
		const { container } = render(<MiniDotsLoader color="destructive" />);
		const dots = container.querySelectorAll("span");
		for (const dot of dots) {
			expect(dot.className).toContain("bg-destructive");
		}
	});

	it("applies success color class", () => {
		const { container } = render(<MiniDotsLoader color="success" />);
		const dots = container.querySelectorAll("span");
		for (const dot of dots) {
			expect(dot.className).toContain("bg-success");
		}
	});

	it("applies white color class", () => {
		const { container } = render(<MiniDotsLoader color="white" />);
		const dots = container.querySelectorAll("span");
		for (const dot of dots) {
			expect(dot.className).toContain("bg-white");
		}
	});

	it("applies custom className to the container", () => {
		render(<MiniDotsLoader className="ml-2" />);
		expect(screen.getByRole("status")).toHaveClass("ml-2");
	});

	it("each dot has rounded-full class", () => {
		const { container } = render(<MiniDotsLoader />);
		const dots = container.querySelectorAll("span");
		for (const dot of dots) {
			expect(dot.className).toContain("rounded-full");
		}
	});
});
