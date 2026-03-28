import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { StripeWordmark } from "../stripe-wordmark";

// ============================================================================
// TESTS
// ============================================================================

afterEach(cleanup);

describe("StripeWordmark", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders an SVG element", () => {
		const { container } = render(<StripeWordmark />);
		expect(container.querySelector("svg")).toBeInTheDocument();
	});

	it("has role=img", () => {
		render(<StripeWordmark />);
		expect(screen.getByRole("img")).toBeInTheDocument();
	});

	it("has aria-label 'Stripe'", () => {
		render(<StripeWordmark />);
		expect(screen.getByRole("img")).toHaveAttribute("aria-label", "Stripe");
	});

	it("has a title element with 'Stripe'", () => {
		const { container } = render(<StripeWordmark />);
		const title = container.querySelector("title");
		expect(title).toBeInTheDocument();
		expect(title?.textContent).toBe("Stripe");
	});

	it("has focusable=false", () => {
		const { container } = render(<StripeWordmark />);
		const svg = container.querySelector("svg");
		expect(svg).toHaveAttribute("focusable", "false");
	});

	it("applies custom className", () => {
		const { container } = render(<StripeWordmark className="text-muted-foreground" />);
		expect(container.querySelector("svg")).toHaveClass("text-muted-foreground");
	});

	it("has correct dimensions (49x20)", () => {
		const { container } = render(<StripeWordmark />);
		const svg = container.querySelector("svg");
		expect(svg).toHaveAttribute("width", "49");
		expect(svg).toHaveAttribute("height", "20");
	});
});
