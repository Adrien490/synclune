import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/orders/constants/shipping-rates", () => ({
	SHIPPING_RATES: {
		FR: {
			amount: 499,
			displayName: "Livraison France",
			estimatedDays: "2-4 jours ouvres",
			carrier: "standard",
			countries: ["FR"],
		},
		EU: {
			amount: 950,
			displayName: "Livraison Europe",
			estimatedDays: "5-8 jours ouvres",
			carrier: "standard",
			countries: ["DE", "BE"],
		},
	},
}));

vi.mock("lucide-react", () => ({
	Truck: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="icon-truck" {...props} />,
}));

import { DeliveryEstimator } from "../delivery-estimator";

describe("DeliveryEstimator", () => {
	beforeEach(() => {
		// Fix date to Wednesday March 25, 2026 10:00 UTC
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-03-25T10:00:00Z"));
	});

	afterEach(() => {
		vi.useRealTimers();
		cleanup();
	});

	it("renders the truck icon", () => {
		render(<DeliveryEstimator />);
		expect(screen.getByTestId("icon-truck")).toBeInTheDocument();
	});

	it("displays delivery date range text", () => {
		render(<DeliveryEstimator />);
		expect(screen.getByText(/livraison estimée entre le/i)).toBeInTheDocument();
	});

	it("calculates correct min date (4 business days from Wednesday = next Tuesday)", () => {
		// Wed Mar 25 + 4 business days = Tue Mar 31
		render(<DeliveryEstimator />);
		expect(screen.getByText("31 mars")).toBeInTheDocument();
	});

	it("calculates correct max date (8 business days from Wednesday = next Thursday+1w)", () => {
		// Wed Mar 25 + 8 business days = Thu Apr 6 (skipping 2 weekends)
		render(<DeliveryEstimator />);
		expect(screen.getByText("6 avril")).toBeInTheDocument();
	});

	it("skips weekends in calculation (Monday start)", () => {
		// Mon Mar 23 + 4 business days = Fri Mar 27
		vi.setSystemTime(new Date("2026-03-23T10:00:00Z"));
		cleanup();
		render(<DeliveryEstimator />);
		expect(screen.getByText("27 mars")).toBeInTheDocument();
	});

	it("renders dates with font-medium class for emphasis", () => {
		render(<DeliveryEstimator />);
		const dates = screen.getAllByText(/mars|avril/);
		for (const date of dates) {
			expect(date).toHaveClass("font-medium");
		}
	});
});
