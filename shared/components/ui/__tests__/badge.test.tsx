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
import { Badge } from "../badge";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("Badge", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders a span by default", () => {
		const { container } = render(<Badge>Label</Badge>);
		expect(container.querySelector("span")).toBeInTheDocument();
	});

	it("has data-slot=badge", () => {
		const { container } = render(<Badge>Label</Badge>);
		expect(container.querySelector("[data-slot='badge']")).toBeInTheDocument();
	});

	it("renders children", () => {
		render(<Badge>Active</Badge>);
		expect(screen.getByText("Active")).toBeInTheDocument();
	});

	it("applies default variant classes", () => {
		const { container } = render(<Badge>Default</Badge>);
		const badge = container.querySelector("[data-slot='badge']");
		expect(badge?.className).toContain("bg-primary");
	});

	it("applies secondary variant classes", () => {
		const { container } = render(<Badge variant="secondary">Secondary</Badge>);
		const badge = container.querySelector("[data-slot='badge']");
		expect(badge?.className).toContain("bg-secondary");
	});

	it("applies destructive variant classes", () => {
		const { container } = render(<Badge variant="destructive">Error</Badge>);
		const badge = container.querySelector("[data-slot='badge']");
		expect(badge?.className).toContain("bg-destructive");
	});

	it("applies success variant classes", () => {
		const { container } = render(<Badge variant="success">OK</Badge>);
		const badge = container.querySelector("[data-slot='badge']");
		expect(badge?.className).toContain("bg-success");
	});

	it("applies warning variant classes", () => {
		const { container } = render(<Badge variant="warning">Warn</Badge>);
		const badge = container.querySelector("[data-slot='badge']");
		expect(badge?.className).toContain("bg-warning");
	});

	it("applies outline variant classes", () => {
		const { container } = render(<Badge variant="outline">Outline</Badge>);
		const badge = container.querySelector("[data-slot='badge']");
		expect(badge?.className).toContain("text-foreground");
	});

	it("applies custom className", () => {
		const { container } = render(<Badge className="mt-2">Custom</Badge>);
		const badge = container.querySelector("[data-slot='badge']");
		expect(badge).toHaveClass("mt-2");
	});

	it("renders as child element when asChild is true", () => {
		render(
			<Badge asChild>
				<a href="/badge">Link Badge</a>
			</Badge>,
		);
		expect(screen.getByRole("link", { name: "Link Badge" })).toBeInTheDocument();
	});
});
