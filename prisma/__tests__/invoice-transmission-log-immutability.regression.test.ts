import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * @regression invoice-transmission-log-immutability-2026-05-28
 *
 * Garantit que le modèle `InvoiceTransmissionLog` reste un audit trail
 * IMMUABLE — sans `deletedAt` (pas de soft-delete), sans `updatedAt` (jamais
 * modifié post-écriture). Mirror conceptuel d'OrderHistory pour la couche
 * transmission PDP (Art. 286 CGI, Art. L102 B LPF — conservation 10 ans).
 *
 * Référence : audit Phase 5 EINV-PROVIDER-002.
 */

const schemaPath = join(process.cwd(), "prisma", "schema.prisma");
const schema = readFileSync(schemaPath, "utf-8");

function extractModelBody(modelName: string): string {
	const re = new RegExp(`model\\s+${modelName}\\s*\\{([\\s\\S]*?)\\n\\}`);
	const match = schema.match(re);
	if (!match) throw new Error(`Model ${modelName} not found in schema.prisma`);
	return match[1] ?? "";
}

describe("InvoiceTransmissionLog — audit immuable", () => {
	const body = extractModelBody("InvoiceTransmissionLog");

	it("has no deletedAt column (no soft-delete)", () => {
		expect(/\bdeletedAt\b/.test(body)).toBe(false);
	});

	it("has no updatedAt column (no mutation post-write)", () => {
		expect(/\bupdatedAt\b/.test(body)).toBe(false);
	});

	it("has @default(now()) on occurredAt (immuable timestamp)", () => {
		expect(/occurredAt\s+DateTime\s+@default\(now\(\)\)/.test(body)).toBe(true);
	});
});

describe("OrderHistory — audit immuable (sanity régression mirror)", () => {
	const body = extractModelBody("OrderHistory");

	it("has no deletedAt column", () => {
		expect(/\bdeletedAt\b/.test(body)).toBe(false);
	});

	it("has no updatedAt column", () => {
		expect(/\bupdatedAt\b/.test(body)).toBe(false);
	});
});
