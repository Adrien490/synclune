import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
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

/**
 * Seconde moitié de l'invariant #3 (audit couverture facturation 2026-05-30,
 * finding #6) : le schéma ne suffit pas. Aucun code applicatif ne doit MUTER une
 * ligne `OrderHistory` (`update`/`delete`/`updateMany`/`deleteMany`) — seuls des
 * `create` (append-only) sont permis. Sans cette garde, un futur
 * `prisma.orderHistory.update(...)` masquerait/réécrirait un audit trail comptable
 * (Art. L123-22) tout en laissant le test au vert.
 *
 * UNIQUE exception (arbitrage 2026-08-03, audit rétention PII) : la purge
 * d'échéance `hard-delete-retention.service.ts` neutralise `note` + `metadata`
 * (ORDER_HISTORY_PII_SCRUB) sur les commandes dont la rétention légale est échue
 * — l'immutabilité vaut PENDANT les 10 ans (Art. L123-22), pas au-delà (RGPD
 * Art. 5.1.e). L'allowlist ci-dessous est FERMÉE : tout autre writer reste une
 * régression réglementaire.
 */
describe("OrderHistory — pas de mutation côté code (append-only)", () => {
	const REPO_ROOT = process.cwd();

	function walkTs(dir: string, out: string[] = []): string[] {
		for (const entry of readdirSync(dir)) {
			if (
				entry === "node_modules" ||
				entry === ".next" ||
				entry === "dist" ||
				entry === "generated" ||
				entry.startsWith(".")
			) {
				continue;
			}
			const full = join(dir, entry);
			if (statSync(full).isDirectory()) {
				walkTs(full, out);
			} else if (
				(entry.endsWith(".ts") || entry.endsWith(".tsx")) &&
				!entry.endsWith(".test.ts") &&
				!entry.endsWith(".test.tsx") &&
				!entry.endsWith(".d.ts") &&
				!full.includes("/__tests__/") &&
				!full.includes("/__mocks__/")
			) {
				out.push(full);
			}
		}
		return out;
	}

	const sourceFiles = [
		...walkTs(join(REPO_ROOT, "modules")),
		...walkTs(join(REPO_ROOT, "app")),
		...walkTs(join(REPO_ROOT, "shared")),
	].filter((f) => !f.replaceAll("\\", "/").includes("/app/generated/")); // client Prisma = autorisé

	function relPath(abs: string): string {
		return relative(REPO_ROOT, abs).replaceAll("\\", "/");
	}

	it("no source file mutates orderHistory (update/delete/updateMany/deleteMany)", () => {
		const mutation =
			/\b(?:prisma|tx)\.orderHistory\.(?:update|delete|updateMany|deleteMany|upsert)\s*\(/;
		const offenders = sourceFiles
			.filter((f) => {
				const content = readFileSync(f, "utf-8");
				const stripped = content.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
				return mutation.test(stripped);
			})
			.map(relPath)
			.sort();
		// Allowlist fermée : la purge d'échéance est le SEUL writer autorisé
		// (neutralisation note/metadata à `paidAt + 10 ans` — arbitrage 2026-08-03).
		expect(offenders).toEqual(["modules/cron/services/hard-delete-retention.service.ts"]);
	});
});
