import { describe, it, expect } from "vitest";
import { computeAverageFulfillmentHours } from "../fulfillment-time.service";

describe("computeAverageFulfillmentHours", () => {
	it("returns 0 for an empty list", () => {
		expect(computeAverageFulfillmentHours([])).toBe(0);
	});

	it("returns 0 when no order has both paidAt and shippedAt", () => {
		expect(
			computeAverageFulfillmentHours([
				{ paidAt: null, shippedAt: new Date() },
				{ paidAt: new Date(), shippedAt: null },
			]),
		).toBe(0);
	});

	it("computes the average of (shippedAt - paidAt) in hours", () => {
		const paid = new Date("2026-02-10T12:00:00Z");
		const shipped48h = new Date("2026-02-12T12:00:00Z");
		const shipped72h = new Date("2026-02-13T12:00:00Z");

		const avg = computeAverageFulfillmentHours([
			{ paidAt: paid, shippedAt: shipped48h },
			{ paidAt: paid, shippedAt: shipped72h },
		]);

		expect(avg).toBeCloseTo(60);
	});

	it("ignores rows without paidAt or shippedAt when computing the mean", () => {
		const paid = new Date("2026-02-10T12:00:00Z");
		const shipped24h = new Date("2026-02-11T12:00:00Z");

		const avg = computeAverageFulfillmentHours([
			{ paidAt: paid, shippedAt: shipped24h },
			{ paidAt: null, shippedAt: shipped24h },
			{ paidAt: paid, shippedAt: null },
		]);

		expect(avg).toBeCloseTo(24);
	});

	it("handles a single valid row correctly", () => {
		const paid = new Date("2026-02-10T12:00:00Z");
		const shipped = new Date("2026-02-10T18:00:00Z");

		expect(computeAverageFulfillmentHours([{ paidAt: paid, shippedAt: shipped }])).toBeCloseTo(6);
	});
});
