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
import { Alert, AlertDescription, AlertTitle } from "../alert";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("Alert", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders with role=alert", () => {
		render(<Alert>Content</Alert>);
		expect(screen.getByRole("alert")).toBeInTheDocument();
	});

	it("has aria-live=polite", () => {
		render(<Alert>Content</Alert>);
		expect(screen.getByRole("alert")).toHaveAttribute("aria-live", "polite");
	});

	it("has aria-atomic=true", () => {
		render(<Alert>Content</Alert>);
		expect(screen.getByRole("alert")).toHaveAttribute("aria-atomic", "true");
	});

	it("has data-slot=alert", () => {
		const { container } = render(<Alert>Content</Alert>);
		expect(container.querySelector("[data-slot='alert']")).toBeInTheDocument();
	});

	it("renders children", () => {
		render(<Alert>Alert message</Alert>);
		expect(screen.getByText("Alert message")).toBeInTheDocument();
	});

	it("applies default variant (no destructive class)", () => {
		const { container } = render(<Alert>Default</Alert>);
		const alert = container.querySelector("[data-slot='alert']");
		expect(alert?.className).toContain("bg-card");
	});

	it("applies destructive variant classes", () => {
		const { container } = render(<Alert variant="destructive">Error</Alert>);
		const alert = container.querySelector("[data-slot='alert']");
		expect(alert?.className).toContain("text-destructive");
	});

	it("applies success variant classes", () => {
		const { container } = render(<Alert variant="success">Success</Alert>);
		const alert = container.querySelector("[data-slot='alert']");
		expect(alert?.className).toContain("text-success");
	});

	it("applies warning variant classes", () => {
		const { container } = render(<Alert variant="warning">Warning</Alert>);
		const alert = container.querySelector("[data-slot='alert']");
		expect(alert?.className).toContain("text-warning-foreground");
	});

	it("applies info variant classes", () => {
		const { container } = render(<Alert variant="info">Info</Alert>);
		const alert = container.querySelector("[data-slot='alert']");
		expect(alert?.className).toContain("text-info");
	});

	it("applies custom className", () => {
		render(<Alert className="my-class">Content</Alert>);
		expect(screen.getByRole("alert")).toHaveClass("my-class");
	});
});

describe("AlertTitle", () => {
	it("renders with data-slot=alert-title", () => {
		const { container } = render(<AlertTitle>Title</AlertTitle>);
		expect(container.querySelector("[data-slot='alert-title']")).toBeInTheDocument();
	});

	it("renders children", () => {
		render(<AlertTitle>My Title</AlertTitle>);
		expect(screen.getByText("My Title")).toBeInTheDocument();
	});

	it("applies custom className", () => {
		const { container } = render(<AlertTitle className="title-class">Title</AlertTitle>);
		expect(container.querySelector("[data-slot='alert-title']")).toHaveClass("title-class");
	});
});

describe("AlertDescription", () => {
	it("renders with data-slot=alert-description", () => {
		const { container } = render(<AlertDescription>Desc</AlertDescription>);
		expect(container.querySelector("[data-slot='alert-description']")).toBeInTheDocument();
	});

	it("renders children", () => {
		render(<AlertDescription>My Description</AlertDescription>);
		expect(screen.getByText("My Description")).toBeInTheDocument();
	});

	it("applies custom className", () => {
		const { container } = render(<AlertDescription className="desc-class">Desc</AlertDescription>);
		expect(container.querySelector("[data-slot='alert-description']")).toHaveClass("desc-class");
	});
});
