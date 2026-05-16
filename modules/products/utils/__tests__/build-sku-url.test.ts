import { describe, expect, it } from "vitest";

import { buildSkuUrl } from "../build-sku-url";

describe("buildSkuUrl", () => {
	const baseUrl = "/creations/bague-lune-argent";

	it("returns the base URL when no SKU fields are set", () => {
		expect(buildSkuUrl(baseUrl, { colors: [], materials: [], size: null })).toBe(baseUrl);
	});

	it("appends ?color when first color slug is present", () => {
		expect(
			buildSkuUrl(baseUrl, {
				colors: [
					{
						colorId: "c",
						position: 0,
						color: { id: "c", slug: "or", name: "Or", hex: "#FFD700" },
					},
				],
				materials: [],
				size: null,
			}),
		).toBe(`${baseUrl}?color=or`);
	});

	it("slugifies material name and appends as ?material", () => {
		expect(
			buildSkuUrl(baseUrl, {
				colors: [],
				materials: [
					{
						materialId: "m",
						position: 0,
						material: { id: "m", name: "Argent massif" },
					},
				],
				size: null,
			}),
		).toBe(`${baseUrl}?material=argent-massif`);
	});

	it("appends ?size verbatim when size is set", () => {
		expect(buildSkuUrl(baseUrl, { colors: [], materials: [], size: "52" })).toBe(
			`${baseUrl}?size=52`,
		);
	});

	it("combines color, material and size in order", () => {
		expect(
			buildSkuUrl(baseUrl, {
				colors: [
					{
						colorId: "c",
						position: 0,
						color: { id: "c", slug: "or", name: "Or", hex: "#FFD700" },
					},
				],
				materials: [
					{
						materialId: "m",
						position: 0,
						material: { id: "m", name: "Argent 925" },
					},
				],
				size: "52",
			}),
		).toBe(`${baseUrl}?color=or&material=argent-925&size=52`);
	});

	it("uses the primary color when SKU is bicolore", () => {
		expect(
			buildSkuUrl(baseUrl, {
				colors: [
					{
						colorId: "c1",
						position: 0,
						color: { id: "c1", slug: "or-rose", name: "Or rose", hex: "#E5C9B3" },
					},
					{
						colorId: "c2",
						position: 1,
						color: { id: "c2", slug: "argent", name: "Argent", hex: "#C0C0C0" },
					},
				],
				materials: [],
				size: null,
			}),
		).toBe(`${baseUrl}?color=or-rose`);
	});
});
