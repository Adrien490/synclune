import type React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import {
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
	CardAction,
	CardContent,
	CardFooter,
} from "../card";

// ============================================================================
// Card
// ============================================================================

describe("Card", () => {
	afterEach(cleanup);

	it("has data-slot='card'", () => {
		render(<Card data-testid="card">content</Card>);
		expect(screen.getByTestId("card")).toHaveAttribute("data-slot", "card");
	});

	it("renders children", () => {
		render(<Card>Card content</Card>);
		expect(screen.getByText("Card content")).toBeInTheDocument();
	});

	it("does not include cursor-pointer class when interactive is false", () => {
		render(<Card data-testid="card">content</Card>);
		expect(screen.getByTestId("card").className).not.toContain("cursor-pointer");
	});

	it("includes cursor-pointer class when interactive is true", () => {
		render(
			<Card data-testid="card" interactive>
				content
			</Card>,
		);
		expect(screen.getByTestId("card").className).toContain("cursor-pointer");
	});

	it("renders as div element", () => {
		render(<Card data-testid="card">content</Card>);
		expect(screen.getByTestId("card").tagName).toBe("DIV");
	});

	it("renders flat by default (mobile-first) and bordered at md:", () => {
		render(<Card data-testid="card">content</Card>);
		const className = screen.getByTestId("card").className;
		expect(className).toContain("border-0");
		expect(className).toContain("shadow-none");
		expect(className).toContain("rounded-none");
		expect(className).toContain("md:border");
		expect(className).toContain("md:shadow-md");
		expect(className).toContain("md:rounded-xl");
	});

	it("gates hover:shadow-lg behind md: for interactive variant (no orphan touch hover)", () => {
		render(
			<Card data-testid="card" interactive>
				content
			</Card>,
		);
		const className = screen.getByTestId("card").className;
		expect(className).toContain("md:hover:shadow-lg");
		expect(className).not.toMatch(/(^|\s)hover:shadow-lg/);
	});
});

// ============================================================================
// CardHeader
// ============================================================================

describe("CardHeader", () => {
	afterEach(cleanup);

	it("has data-slot='card-header'", () => {
		render(<CardHeader data-testid="header">header</CardHeader>);
		expect(screen.getByTestId("header")).toHaveAttribute("data-slot", "card-header");
	});

	it("uses --admin-main-x var padding on mobile and px-6 at md:", () => {
		render(<CardHeader data-testid="header">header</CardHeader>);
		const className = screen.getByTestId("header").className;
		expect(className).toContain("px-[var(--admin-main-x,1rem)]");
		expect(className).toContain("md:px-6");
	});
});

// ============================================================================
// CardTitle
// ============================================================================

describe("CardTitle", () => {
	afterEach(cleanup);

	it("has data-slot='card-title'", () => {
		render(<CardTitle data-testid="title">Title</CardTitle>);
		expect(screen.getByTestId("title")).toHaveAttribute("data-slot", "card-title");
	});

	it("renders children", () => {
		render(<CardTitle>My Card Title</CardTitle>);
		expect(screen.getByText("My Card Title")).toBeInTheDocument();
	});

	it("is uppercase tracking-wider mobile and font-display normal-case at md:", () => {
		render(<CardTitle data-testid="title">Title</CardTitle>);
		const className = screen.getByTestId("title").className;
		expect(className).toContain("uppercase");
		expect(className).toContain("tracking-wider");
		expect(className).toContain("text-xs");
		expect(className).toContain("md:font-display");
		expect(className).toContain("md:text-lg");
		expect(className).toContain("md:normal-case");
		expect(className).toContain("md:tracking-normal");
	});
});

// ============================================================================
// CardDescription
// ============================================================================

describe("CardDescription", () => {
	afterEach(cleanup);

	it("has data-slot='card-description'", () => {
		render(<CardDescription data-testid="desc">Description</CardDescription>);
		expect(screen.getByTestId("desc")).toHaveAttribute("data-slot", "card-description");
	});
});

// ============================================================================
// CardAction
// ============================================================================

describe("CardAction", () => {
	afterEach(cleanup);

	it("has data-slot='card-action'", () => {
		render(<CardAction data-testid="action">action</CardAction>);
		expect(screen.getByTestId("action")).toHaveAttribute("data-slot", "card-action");
	});
});

// ============================================================================
// CardContent
// ============================================================================

describe("CardContent", () => {
	afterEach(cleanup);

	it("has data-slot='card-content'", () => {
		render(<CardContent data-testid="content">content</CardContent>);
		expect(screen.getByTestId("content")).toHaveAttribute("data-slot", "card-content");
	});
});

// ============================================================================
// CardFooter
// ============================================================================

describe("CardFooter", () => {
	afterEach(cleanup);

	it("has data-slot='card-footer'", () => {
		render(<CardFooter data-testid="footer">footer</CardFooter>);
		expect(screen.getByTestId("footer")).toHaveAttribute("data-slot", "card-footer");
	});
});
