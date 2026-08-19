import { vi } from "vitest";
import { Prisma } from "@/app/generated/prisma/client";

/**
 * Harnais commun des tests d'actions VARIANT.
 *
 * Ces huit actions n'avaient AUCUN test avant l'audit du 2026-08-19 (0 % de
 * couverture mesurée sur `actions/`), gardes comprises — alors que ce sont elles
 * qui tiennent « chaque produit garde au moins une variante », « jamais la
 * dernière variante active d'un produit en vente » et le plancher/plafond
 * d'inventaire.
 */
export function makeFormData(entries: Record<string, string>): FormData {
	const formData = new FormData();
	for (const [key, value] of Object.entries(entries)) formData.set(key, value);
	return formData;
}

/** cuid2 valides — `z.cuid2()` refuse tout le reste. */
export const VARIANT_ID = "k3x9m2p8q1r5s7t0uvwxyz01";
export const OTHER_VARIANT_ID = "a1b2c3d4e5f6g7h8i9j0klmn";
export const PRODUCT_ID = "p1q2r3s4t5u6v7w8x9y0zabc";

/** Type du mock Prisma partagé — évite un `import()` inline (règle ESLint). */
export type VariantPrismaMock = ReturnType<typeof makePrismaMock>;

export function makePrismaMock() {
	return {
		productVariant: {
			findUnique: vi.fn(),
			findFirst: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			updateMany: vi.fn(),
			delete: vi.fn(),
		},
		product: { findUnique: vi.fn() },
		$transaction: vi.fn(),
		$queryRaw: vi.fn(),
	};
}

/**
 * Violation d'unicité Prisma — VRAIE instance de
 * `PrismaClientKnownRequestError`, jamais un `Object.assign(new Error(), { code })`
 * (convention du dépôt) : c'est la seule forme que `isUniqueConstraintError`
 * reconnaît, et donc la seule qui exerce honnêtement le message contextualisé.
 */
export function uniqueViolation(): Prisma.PrismaClientKnownRequestError {
	return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
		code: "P2002",
		clientVersion: "7.9.1",
	});
}
