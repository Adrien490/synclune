import { describe, expect, it } from "vitest";
import { processSteps, type ProcessStep } from "../process-steps";

describe("processSteps", () => {
	it("has exactly 4 steps", () => {
		expect(processSteps).toHaveLength(4);
	});

	it("each step has all required fields", () => {
		const requiredKeys: (keyof ProcessStep)[] = [
			"id",
			"title",
			"description",
			"color",
			"iconHoverClass",
			"glowClass",
			"intensity",
		];

		for (const step of processSteps) {
			for (const key of requiredKeys) {
				expect(step[key], `step "${step.id}" missing "${key}"`).toBeDefined();
			}
		}
	});

	it("each step has a unique id", () => {
		const ids = processSteps.map((s) => s.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it("each step has non-empty title and description", () => {
		for (const step of processSteps) {
			expect(step.title.length, `step "${step.id}" title is empty`).toBeGreaterThan(0);
			expect(step.description.length, `step "${step.id}" description is empty`).toBeGreaterThan(0);
		}
	});

	it("each step has intensity with ring and shadow strings", () => {
		for (const step of processSteps) {
			expect(typeof step.intensity.ring).toBe("string");
			expect(typeof step.intensity.shadow).toBe("string");
		}
	});

	it("step ids match expected creation process order", () => {
		const ids = processSteps.map((s) => s.id);
		expect(ids).toEqual(["idea", "drawing", "assembly", "finishing"]);
	});
});
