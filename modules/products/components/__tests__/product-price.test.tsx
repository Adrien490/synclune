import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Mock formatEuro so tests are locale-independent
vi.mock("@/shared/utils/format-euro", () => ({
	formatEuro: (cents: number) => `${(cents / 100).toFixed(2)} €`,
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

import { ProductPrice } from "../product-price";

afterEach(cleanup);

describe("ProductPrice", () => {
	it("renders the regular price formatted in euros", () => {
		render(<ProductPrice price={4999} />);

		expect(screen.getByText("49.99 €")).toBeInTheDocument();
	});

	it("renders the discounted price alongside the original struck-through price", () => {
		render(<ProductPrice price={3500} compareAtPrice={5000} />);

		// Current (discounted) price
		expect(screen.getByText("35.00 €")).toBeInTheDocument();

		// Original price visible to sighted users (aria-hidden)
		const struckThrough = screen.getByText("50.00 €", { selector: "[aria-hidden]" });
		expect(struckThrough).toBeInTheDocument();
		expect(struckThrough).toHaveClass("line-through");

		// Screen-reader text
		expect(screen.getByText(/Prix original/i)).toBeInTheDocument();
	});

	it("does not render the original price when there is no discount", () => {
		render(<ProductPrice price={4999} compareAtPrice={null} />);

		// Only one price element should be visible
		expect(screen.queryByText(/Prix original/i)).not.toBeInTheDocument();
		expect(screen.queryByRole("presentation")).not.toBeInTheDocument();
	});

	it("does not render the original price when compareAtPrice equals price (no real discount)", () => {
		render(<ProductPrice price={4999} compareAtPrice={4999} />);

		expect(screen.queryByText(/Prix original/i)).not.toBeInTheDocument();
	});

	it("renders a zero price as 0.00 €", () => {
		render(<ProductPrice price={0} />);

		expect(screen.getByText("0.00 €")).toBeInTheDocument();
	});

	it("forwards a custom className to the wrapper element", () => {
		const { container } = render(<ProductPrice price={1000} className="custom-class" />);

		expect(container.firstChild).toHaveClass("custom-class");
	});
});
