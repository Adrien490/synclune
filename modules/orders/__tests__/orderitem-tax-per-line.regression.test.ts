import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * @regression orderitem-tax-per-line-2026-05-27
 *
 * Verrouille les champs TVA par ligne sur `OrderItem` (Phase 2A —
 * EINV-AUDIT-002). Sans ces champs, impossible de générer un fichier
 * Factur-X / UBL / CII conforme — la directive EU 2014/55 et les
 * codes CEFACT UNTDID 5305 (BT-151 Item VAT category) exigent
 * `taxRate`, `taxAmount` et `taxCategoryCode` par ligne.
 *
 * Les valeurs par défaut (0 / 0 / NULL) préservent le comportement
 * franchise art. 293 B actuel ; le code applicatif (Phase 2A,
 * order-creation.service) écrit `lineTotalExcludingTax = price *
 * quantity` et `taxCategoryCode = "ZB"` pour les nouvelles commandes.
 */
describe("OrderItem model — TVA par ligne (Phase 2A)", () => {
	const schemaPath = join(process.cwd(), "prisma", "schema.prisma");
	const schema = readFileSync(schemaPath, "utf-8");

	function extractModel(name: string): string {
		const match = schema.match(new RegExp(`model\\s+${name}\\s*\\{([\\s\\S]*?)\\n\\}`, "m"));
		if (!match) throw new Error(`Model ${name} not found`);
		return match[1]!;
	}

	const orderItem = extractModel("OrderItem");

	it("taxRate is Int default 0 (basis points: 2000 = 20%)", () => {
		expect(orderItem).toMatch(/^\s*taxRate\s+Int\s+@default\(0\)/m);
	});

	it("taxAmount is Int default 0 (centimes)", () => {
		expect(orderItem).toMatch(/^\s*taxAmount\s+Int\s+@default\(0\)/m);
	});

	it("lineTotalExcludingTax is Int default 0", () => {
		expect(orderItem).toMatch(/^\s*lineTotalExcludingTax\s+Int\s+@default\(0\)/m);
	});

	it("lineTotalIncludingTax is Int default 0", () => {
		expect(orderItem).toMatch(/^\s*lineTotalIncludingTax\s+Int\s+@default\(0\)/m);
	});

	it("taxCategoryCode is nullable VarChar(2) — CEFACT UNTDID 5305", () => {
		expect(orderItem).toMatch(/^\s*taxCategoryCode\s+String\?\s+@db\.VarChar\(2\)/m);
	});
});
