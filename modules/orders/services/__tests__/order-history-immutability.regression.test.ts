import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * @regression invoice-audit-trail-immutability-2026-05-27
 *
 * `OrderHistory` est l'audit trail comptable d'une commande (Art. L123-22
 * Code de Commerce, conservation 10 ans). Il doit rester immuable même
 * lorsqu'un `Order` est soft-deleted :
 *  - PAS de `deletedAt` sur le modèle Prisma (sinon on pourrait masquer un
 *    historique).
 *  - PAS de mutation (`update`/`delete`) dans le code applicatif (seul
 *    `createOrderAuditTx` doit écrire dedans).
 *
 * Cf. CLAUDE.md § "Facturation électronique — invariants" #3.
 */
describe("OrderHistory — audit trail immutability", () => {
	const schemaPath = join(process.cwd(), "prisma", "schema.prisma");
	const schema = readFileSync(schemaPath, "utf-8");

	function extractModel(name: string): string {
		const match = schema.match(new RegExp(`model\\s+${name}\\s*\\{([\\s\\S]*?)\\n\\}`, "m"));
		if (!match) throw new Error(`Model ${name} not found in schema.prisma`);
		return match[1]!;
	}

	it("does not declare a deletedAt field", () => {
		const body = extractModel("OrderHistory");
		expect(body).not.toMatch(/^\s*deletedAt\b/m);
	});

	it("declares createdAt (timestamp obligatoire pour audit trail)", () => {
		const body = extractModel("OrderHistory");
		expect(body).toMatch(/^\s*createdAt\s+DateTime/m);
	});

	it("does not declare an updatedAt field (les lignes d'historique ne se modifient pas)", () => {
		const body = extractModel("OrderHistory");
		expect(body).not.toMatch(/^\s*updatedAt\b/m);
	});

	it("Order is soft-deletable mais OrderHistory pas (différence intentionnelle)", () => {
		const order = extractModel("Order");
		const history = extractModel("OrderHistory");
		expect(order).toMatch(/^\s*deletedAt\s+DateTime\?/m);
		expect(history).not.toMatch(/^\s*deletedAt\b/m);
	});
});
