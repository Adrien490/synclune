import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * @regression order-b2b-snapshot-2026-05-27
 *
 * Verrouille les champs de snapshot B2B/B2G sur le modèle `Order`
 * (Phase 2A — EINV-AUDIT-001). Une commande émise B2B doit garder son
 * identification d'entreprise figée même si le User bascule de profil
 * (ou est anonymisé) — Art. 289 CGI + L102 B LPF.
 */
describe("Order model — B2B/B2G snapshot fields", () => {
	const schemaPath = join(process.cwd(), "prisma", "schema.prisma");
	const schema = readFileSync(schemaPath, "utf-8");

	function extractModel(name: string): string {
		const match = schema.match(new RegExp(`model\\s+${name}\\s*\\{([\\s\\S]*?)\\n\\}`, "m"));
		if (!match) throw new Error(`Model ${name} not found in schema.prisma`);
		return match[1]!;
	}

	const order = extractModel("Order");

	it("Order.customerType defaults to B2C (backward compat)", () => {
		expect(order).toMatch(/^\s*customerType\s+CustomerType\s+@default\(B2C\)/m);
	});

	it("Order.customerCompanyName is nullable VarChar(255) (snapshot raison sociale)", () => {
		expect(order).toMatch(/^\s*customerCompanyName\s+String\?\s+@db\.VarChar\(255\)/m);
	});

	it("Order.customerCompanySiren is nullable VarChar(9)", () => {
		expect(order).toMatch(/^\s*customerCompanySiren\s+String\?\s+@db\.VarChar\(9\)/m);
	});

	it("Order.customerCompanySiret is nullable VarChar(14)", () => {
		expect(order).toMatch(/^\s*customerCompanySiret\s+String\?\s+@db\.VarChar\(14\)/m);
	});

	it("Order.customerCompanyVatNumber is nullable VarChar(15)", () => {
		expect(order).toMatch(/^\s*customerCompanyVatNumber\s+String\?\s+@db\.VarChar\(15\)/m);
	});

	it("dashboard index covers (customerType, paidAt desc) for B2B/B2C analytics", () => {
		expect(order).toMatch(/@@index\(\[customerType,\s*paidAt\(sort:\s*Desc\)\]\)/);
	});
});
