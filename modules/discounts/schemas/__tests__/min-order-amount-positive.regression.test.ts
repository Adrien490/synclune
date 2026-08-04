/**
 * @regression discount-min-order-amount-positive
 *
 * `minOrderAmount` doit refléter le CHECK DB, qui exige > 0 — pas ≥ 0.
 *
 * ⚠️ Le schéma acceptait `0` (`.nonnegative()`) alors que
 * `raw-guards.sql` pose :
 *
 *     CHECK ("minOrderAmount" IS NULL OR "minOrderAmount" > 0)
 *
 * motivé au schéma Prisma par « 0 serait un code inutilisable créé par erreur ».
 * Trois choses conspiraient pour rendre la saisie atteignable :
 *   - l'input admin proposait `min={0}` ;
 *   - `formData.get()` rend la CHAÎNE `"0"`, qui est **truthy** — la garde
 *     `rawMinOrderEuros ? … : null` ne la convertissait donc pas en `null` ;
 *   - le schéma laissait passer.
 *
 * Résultat : l'admin saisissait 0, rien ne bronchait, et Postgres rejetait la
 * transaction en erreur générique. Un minimum nul et l'absence de minimum étant la
 * même intention, on n'en persiste qu'une seule forme : `null`.
 */

import { describe, expect, it } from "vitest";

import { createDiscountSchema, updateDiscountSchema } from "../discount.schemas";

const base = {
	code: "PROMO20",
	type: "PERCENTAGE" as const,
	value: 20,
	maxUsageCount: null,
	maxUsagePerUser: null,
	endsAt: null,
};

describe("@regression minOrderAmount — parité avec le CHECK DB", () => {
	it("rejette 0 (le CHECK DB l'aurait rejeté après coup)", () => {
		const result = createDiscountSchema.safeParse({ ...base, minOrderAmount: 0 });

		expect(result.success).toBe(false);
	});

	it("rejette 0 aussi à la mise à jour", () => {
		const result = updateDiscountSchema.safeParse({
			...base,
			id: "ekxpqzvlyfvmqbhjwvxkzqct",
			minOrderAmount: 0,
		});

		expect(result.success).toBe(false);
	});

	it("rejette un montant négatif", () => {
		expect(createDiscountSchema.safeParse({ ...base, minOrderAmount: -1 }).success).toBe(false);
	});

	it("accepte `null` — c'est la forme de « aucun minimum »", () => {
		expect(createDiscountSchema.safeParse({ ...base, minOrderAmount: null }).success).toBe(true);
	});

	it("accepte un montant strictement positif (contre-épreuve)", () => {
		const result = createDiscountSchema.safeParse({ ...base, minOrderAmount: 5000 });

		expect(result.success).toBe(true);
		if (result.success) expect(result.data.minOrderAmount).toBe(5000);
	});

	it("porte un message qui oriente vers le champ vide plutôt que vers 0", () => {
		const result = createDiscountSchema.safeParse({ ...base, minOrderAmount: 0 });

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]?.message).toMatch(/laisser vide/i);
		}
	});
});
