import { describe, expect, it } from "vitest";

import {
	canTransitionProductStatus,
	getAllowedTransitions,
} from "../product-status-validation.service";

describe("canTransitionProductStatus", () => {
	it("DRAFT → PUBLIC autorisé", () => {
		expect(canTransitionProductStatus("DRAFT", "PUBLIC")).toBe(true);
	});

	it("DRAFT → ARCHIVED autorisé", () => {
		expect(canTransitionProductStatus("DRAFT", "ARCHIVED")).toBe(true);
	});

	it("PUBLIC → DRAFT autorisé", () => {
		expect(canTransitionProductStatus("PUBLIC", "DRAFT")).toBe(true);
	});

	it("PUBLIC → ARCHIVED autorisé", () => {
		expect(canTransitionProductStatus("PUBLIC", "ARCHIVED")).toBe(true);
	});

	it("ARCHIVED → DRAFT autorisé", () => {
		expect(canTransitionProductStatus("ARCHIVED", "DRAFT")).toBe(true);
	});

	it("ARCHIVED → PUBLIC autorisé", () => {
		expect(canTransitionProductStatus("ARCHIVED", "PUBLIC")).toBe(true);
	});

	it("DRAFT → DRAFT refusé (transition identité)", () => {
		expect(canTransitionProductStatus("DRAFT", "DRAFT")).toBe(false);
	});

	it("PUBLIC → PUBLIC refusé (transition identité)", () => {
		expect(canTransitionProductStatus("PUBLIC", "PUBLIC")).toBe(false);
	});

	it("ARCHIVED → ARCHIVED refusé (transition identité)", () => {
		expect(canTransitionProductStatus("ARCHIVED", "ARCHIVED")).toBe(false);
	});
});

describe("getAllowedTransitions", () => {
	it("retourne PUBLIC et ARCHIVED depuis DRAFT", () => {
		expect(getAllowedTransitions("DRAFT")).toEqual(["PUBLIC", "ARCHIVED"]);
	});

	it("retourne DRAFT et ARCHIVED depuis PUBLIC", () => {
		expect(getAllowedTransitions("PUBLIC")).toEqual(["DRAFT", "ARCHIVED"]);
	});

	it("retourne DRAFT et PUBLIC depuis ARCHIVED", () => {
		expect(getAllowedTransitions("ARCHIVED")).toEqual(["DRAFT", "PUBLIC"]);
	});
});
