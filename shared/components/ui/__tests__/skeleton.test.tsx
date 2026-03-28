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

// Import AFTER mocks
import { Skeleton, SkeletonAvatar, SkeletonButton, SkeletonGroup, SkeletonText } from "../skeleton";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("Skeleton", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders a div with role=presentation", () => {
		const { container } = render(<Skeleton />);
		expect(container.querySelector("[role='presentation']")).toBeInTheDocument();
	});

	it("has aria-hidden=true", () => {
		const { container } = render(<Skeleton />);
		expect(container.querySelector("[data-slot='skeleton']")).toHaveAttribute(
			"aria-hidden",
			"true",
		);
	});

	it("has data-slot=skeleton", () => {
		const { container } = render(<Skeleton />);
		expect(container.querySelector("[data-slot='skeleton']")).toBeInTheDocument();
	});

	it("applies shimmer variant by default", () => {
		const { container } = render(<Skeleton />);
		expect(container.querySelector("[data-slot='skeleton']")?.className).toContain(
			"animate-shimmer",
		);
	});

	it("applies default variant (animate-pulse)", () => {
		const { container } = render(<Skeleton variant="default" />);
		expect(container.querySelector("[data-slot='skeleton']")?.className).toContain("animate-pulse");
	});

	it("applies rectangle shape by default (rounded-md)", () => {
		const { container } = render(<Skeleton />);
		expect(container.querySelector("[data-slot='skeleton']")?.className).toContain("rounded-md");
	});

	it("applies circle shape (rounded-full)", () => {
		const { container } = render(<Skeleton shape="circle" />);
		expect(container.querySelector("[data-slot='skeleton']")?.className).toContain("rounded-full");
	});

	it("applies text shape (rounded)", () => {
		const { container } = render(<Skeleton shape="text" />);
		expect(container.querySelector("[data-slot='skeleton']")?.className).toContain("rounded");
	});

	it("applies size=xs (h-3)", () => {
		const { container } = render(<Skeleton size="xs" />);
		expect(container.querySelector("[data-slot='skeleton']")?.className).toContain("h-3");
	});

	it("applies size=xl (h-10)", () => {
		const { container } = render(<Skeleton size="xl" />);
		expect(container.querySelector("[data-slot='skeleton']")?.className).toContain("h-10");
	});

	it("applies custom className", () => {
		const { container } = render(<Skeleton className="w-32" />);
		expect(container.querySelector("[data-slot='skeleton']")).toHaveClass("w-32");
	});
});

describe("SkeletonGroup", () => {
	it("renders with role=status", () => {
		render(<SkeletonGroup label="Loading products">content</SkeletonGroup>);
		expect(screen.getByRole("status")).toBeInTheDocument();
	});

	it("has aria-busy=true", () => {
		render(<SkeletonGroup label="Loading">content</SkeletonGroup>);
		expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
	});

	it("has aria-label matching the label prop", () => {
		render(<SkeletonGroup label="Loading table">content</SkeletonGroup>);
		expect(screen.getByRole("status")).toHaveAttribute("aria-label", "Loading table");
	});

	it("renders sr-only label text", () => {
		render(<SkeletonGroup label="Loading orders">content</SkeletonGroup>);
		expect(screen.getByText("Loading orders")).toBeInTheDocument();
	});

	it("renders children", () => {
		render(
			<SkeletonGroup label="Loading">
				<div data-testid="child">child</div>
			</SkeletonGroup>,
		);
		expect(screen.getByTestId("child")).toBeInTheDocument();
	});
});

describe("SkeletonText", () => {
	it("renders one skeleton line by default", () => {
		const { container } = render(<SkeletonText />);
		expect(container.querySelectorAll("[data-slot='skeleton']")).toHaveLength(1);
	});

	it("renders multiple skeleton lines when lines>1", () => {
		const { container } = render(<SkeletonText lines={3} />);
		expect(container.querySelectorAll("[data-slot='skeleton']")).toHaveLength(3);
	});

	it("last line has w-3/4 class when lines>1", () => {
		const { container } = render(<SkeletonText lines={3} />);
		const skeletons = container.querySelectorAll("[data-slot='skeleton']");
		expect(skeletons[2]?.className).toContain("w-3/4");
	});

	it("single line does not have w-3/4 class", () => {
		const { container } = render(<SkeletonText lines={1} />);
		const skeleton = container.querySelector("[data-slot='skeleton']");
		expect(skeleton?.className).not.toContain("w-3/4");
	});
});

describe("SkeletonAvatar", () => {
	it("renders a circle-shaped skeleton", () => {
		const { container } = render(<SkeletonAvatar />);
		const skeleton = container.querySelector("[data-slot='skeleton']");
		expect(skeleton?.className).toContain("rounded-full");
	});

	it("applies sm size (size-8)", () => {
		const { container } = render(<SkeletonAvatar size="sm" />);
		expect(container.querySelector("[data-slot='skeleton']")?.className).toContain("size-8");
	});

	it("applies md size (size-10) by default", () => {
		const { container } = render(<SkeletonAvatar />);
		expect(container.querySelector("[data-slot='skeleton']")?.className).toContain("size-10");
	});

	it("applies lg size (size-12)", () => {
		const { container } = render(<SkeletonAvatar size="lg" />);
		expect(container.querySelector("[data-slot='skeleton']")?.className).toContain("size-12");
	});
});

describe("SkeletonButton", () => {
	it("applies default size classes (h-10 w-28)", () => {
		const { container } = render(<SkeletonButton />);
		const skeleton = container.querySelector("[data-slot='skeleton']");
		expect(skeleton?.className).toContain("h-10");
		expect(skeleton?.className).toContain("w-28");
	});

	it("applies sm size (h-8 w-20)", () => {
		const { container } = render(<SkeletonButton size="sm" />);
		const skeleton = container.querySelector("[data-slot='skeleton']");
		expect(skeleton?.className).toContain("h-8");
		expect(skeleton?.className).toContain("w-20");
	});

	it("applies lg size (h-12 w-36)", () => {
		const { container } = render(<SkeletonButton size="lg" />);
		const skeleton = container.querySelector("[data-slot='skeleton']");
		expect(skeleton?.className).toContain("h-12");
		expect(skeleton?.className).toContain("w-36");
	});

	it("has rounded shape (rounded-lg)", () => {
		const { container } = render(<SkeletonButton />);
		expect(container.querySelector("[data-slot='skeleton']")?.className).toContain("rounded-lg");
	});
});
