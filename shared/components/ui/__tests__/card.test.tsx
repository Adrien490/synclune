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
