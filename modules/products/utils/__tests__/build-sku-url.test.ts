import { describe, expect, it } from "vitest";

import { buildSkuUrl } from "../build-sku-url";

describe("buildSkuUrl", () => {
	const baseUrl = "/creations/bague-lune-argent";

	it("returns the base URL when no SKU fields are set", () => {
		expect(buildSkuUrl(baseUrl, { color: null, material: null, size: null })).toBe(baseUrl);
	});

	it("appends ?color when color.slug is present", () => {
		expect(
			buildSkuUrl(baseUrl, {
				color: { id: "c", slug: "or", name: "Or", hex: "#FFD700" },
				material: null,
				size: null,
			}),
		).toBe(`${baseUrl}?color=or`);
	});

	it("slugifies material name and appends as ?material", () => {
		expect(
			buildSkuUrl(baseUrl, {
				color: null,
				material: { id: "m", name: "Argent massif" },
				size: null,
			}),
		).toBe(`${baseUrl}?material=argent-massif`);
	});

	it("appends ?size verbatim when size is set", () => {
		expect(buildSkuUrl(baseUrl, { color: null, material: null, size: "52" })).toBe(
			`${baseUrl}?size=52`,
		);
	});

	it("combines color, material and size in order", () => {
		expect(
			buildSkuUrl(baseUrl, {
				color: { id: "c", slug: "or", name: "Or", hex: "#FFD700" },
				material: { id: "m", name: "Argent 925" },
				size: "52",
			}),
		).toBe(`${baseUrl}?color=or&material=argent-925&size=52`);
	});

	it("ignores color when slug is missing", () => {
		expect(
			buildSkuUrl(baseUrl, {
				// @ts-expect-error — runtime tolerance for missing slug
				color: { id: "c", name: "Or", hex: "#FFD700" },
				material: null,
				size: null,
			}),
		).toBe(baseUrl);
	});
});
