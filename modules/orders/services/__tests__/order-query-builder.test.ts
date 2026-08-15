import { describe, expect, it } from "vitest";
import { buildOrderSearchConditions, buildOrderWhereClause } from "../order-query-builder";

describe("buildOrderSearchConditions", () => {
	it("cherche l'email (insensible à la casse) et l'id exact", () => {
		const where = buildOrderSearchConditions("marie@example.com");
		expect(where.OR).toContainEqual({
			email: { contains: "marie@example.com", mode: "insensitive" },
		});
		expect(where.OR).toContainEqual({ id: "marie@example.com" });
	});

	it("un terme numérique cherche AUSSI le numéro de facture exact", () => {
		const where = buildOrderSearchConditions("42");
		expect(where.OR).toContainEqual({ invoiceNumber: 42 });
	});

	it("un terme non numérique ne produit pas de clause invoiceNumber", () => {
		const where = buildOrderSearchConditions("marie");
		expect(where.OR?.some((c) => "invoiceNumber" in c)).toBe(false);
	});

	it("échappe les métacaractères LIKE (% _ \\) — `contains` Prisma ne le fait pas", () => {
		const where = buildOrderSearchConditions("100%_marie");
		const emailCondition = where.OR?.find((c) => "email" in c) as {
			email: { contains: string };
		};
		expect(emailCondition.email.contains).toBe("100\\%\\_marie");
	});
});

describe("buildOrderWhereClause", () => {
	it("vide sans recherche ni filtre", () => {
		expect(buildOrderWhereClause({})).toEqual({});
	});

	it("filtre par statuts multiples", () => {
		expect(buildOrderWhereClause({ filters: { status: ["PAID", "SHIPPED"] } })).toEqual({
			status: { in: ["PAID", "SHIPPED"] },
		});
	});

	it("combine recherche et filtre en AND", () => {
		const where = buildOrderWhereClause({ search: "42", filters: { status: ["PAID"] } });
		expect(where.AND).toHaveLength(2);
	});

	it("ignore un filtre status vide", () => {
		expect(buildOrderWhereClause({ filters: { status: [] } })).toEqual({});
	});
});
