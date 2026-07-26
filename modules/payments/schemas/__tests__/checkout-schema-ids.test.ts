/**
 * F2 (audit validation Zod 2026-07-06) — unification du format des IDs.
 *
 * `cartItemSchema.skuId` acceptait n'importe quelle string non vide
 * (`z.string().min(1)`) alors que le reste du codebase valide en `z.cuid2()`.
 * Les IDs DB sont des cuid v1 (Prisma `@default(cuid())`, 25 chars préfixe c),
 * acceptés par la regex cuid2 (`^[0-9a-z]+$`).
 */
import { describe, it, expect } from "vitest";
import { confirmCheckoutSchema } from "../checkout.schema";

const skuIdSchema = confirmCheckoutSchema.shape.cartItems.element.shape.skuId;

// cuid v1 réel (format @default(cuid()) Prisma)
const CUID_V1 = "cm3x7k2ab0001qz8v4h2j9d3e";

describe("confirmCheckoutSchema — cartItems.skuId (cuid2)", () => {
	it("accepte un cuid v1 réel (IDs DB Prisma)", () => {
		expect(skuIdSchema.safeParse(CUID_V1).success).toBe(true);
	});

	it("rejette une injection SQL-like", () => {
		expect(skuIdSchema.safeParse("1 OR 1=1").success).toBe(false);
	});

	it("rejette une string vide", () => {
		expect(skuIdSchema.safeParse("").success).toBe(false);
	});

	it("rejette un id en uppercase", () => {
		expect(skuIdSchema.safeParse(CUID_V1.toUpperCase()).success).toBe(false);
	});

	it("rejette un id avec tirets/caractères spéciaux", () => {
		expect(skuIdSchema.safeParse("sku-123").success).toBe(false);
		expect(skuIdSchema.safeParse("../etc/passwd").success).toBe(false);
	});
});
