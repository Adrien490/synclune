import { describe, expect, it } from "vitest";

import { SLIDER_MAX, sliderToPrice, priceToSlider } from "../price-filter";

describe("price-filter", () => {
	describe("SLIDER_MAX", () => {
		it("is 100", () => {
			expect(SLIDER_MAX).toBe(100);
		});
	});

	describe("sliderToPrice", () => {
		it("returns 0 for position 0", () => {
			expect(sliderToPrice(0, 400)).toBe(0);
		});

		it("returns maxPrice for position SLIDER_MAX", () => {
			expect(sliderToPrice(SLIDER_MAX, 400)).toBe(400);
		});

		it("returns maxPrice for position > SLIDER_MAX", () => {
			expect(sliderToPrice(150, 400)).toBe(400);
		});

		it("returns 0 for negative position", () => {
			expect(sliderToPrice(-10, 400)).toBe(0);
		});

		it("applies quadratic scaling (50% position = 25% price)", () => {
			const price = sliderToPrice(50, 400);
			expect(price).toBe(100); // (50/100)^2 * 400 = 100
		});

		it("applies quadratic scaling (25% position)", () => {
			const price = sliderToPrice(25, 400);
			expect(price).toBe(25); // (25/100)^2 * 400 = 25
		});

		it("applies quadratic scaling (75% position)", () => {
			const price = sliderToPrice(75, 400);
			expect(price).toBe(225); // (75/100)^2 * 400 = 225
		});
	});

	describe("priceToSlider", () => {
		it("returns 0 for price 0", () => {
			expect(priceToSlider(0, 400)).toBe(0);
		});

		it("returns SLIDER_MAX for price = maxPrice", () => {
			expect(priceToSlider(400, 400)).toBe(SLIDER_MAX);
		});

		it("returns SLIDER_MAX for price > maxPrice", () => {
			expect(priceToSlider(500, 400)).toBe(SLIDER_MAX);
		});

		it("returns 0 for negative price", () => {
			expect(priceToSlider(-10, 400)).toBe(0);
		});

		it("is the inverse of sliderToPrice", () => {
			const maxPrice = 400;
			for (const position of [10, 25, 50, 75, 90]) {
				const price = sliderToPrice(position, maxPrice);
				const backToPosition = priceToSlider(price, maxPrice);
				expect(backToPosition).toBe(position);
			}
		});
	});
});
