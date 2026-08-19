import { describe, expect, it } from "vitest";
import { buildWhereClause } from "../build-where-clause";

const BASE = {
	cursor: undefined,
	direction: "forward" as const,
	perPage: 20,
	sortBy: "created-descending" as const,
};

describe("buildWhereClause", () => {
	it("retourne une clause vide sans recherche ni filtre", () => {
		expect(buildWhereClause({ ...BASE })).toEqual({});
	});

	it("cherche le terme dans le nom du produit, de la couleur et du matériau", () => {
		const where = buildWhereClause({ ...BASE, search: "rose" });

		expect(where.OR).toHaveLength(3);
		expect(where.OR?.[0]).toMatchObject({
			product: { name: { contains: "rose", mode: "insensitive" } },
		});
	});

	/**
	 * Prisma `contains` ne neutralise pas % _ \ (P3-3) : un terme utilisateur
	 * contenant un joker LIKE doit arriver ÉCHAPPÉ à la base.
	 */
	it("échappe les jokers LIKE du terme de recherche", () => {
		const where = buildWhereClause({ ...BASE, search: "100%" });

		expect(where.OR?.[0]).toMatchObject({
			product: { name: { contains: "100\\%" } },
		});
	});

	it("ignore une recherche réduite à des espaces", () => {
		expect(buildWhereClause({ ...BASE, search: "   " })).toEqual({});
	});

	it("empile les filtres sous AND à côté de la recherche", () => {
		const where = buildWhereClause({
			...BASE,
			search: "rose",
			filters: { productId: "p1", active: true },
		});

		expect(where.OR).toHaveLength(3);
		expect(where.AND).toEqual([{ productId: "p1" }, { active: true }]);
	});
});
