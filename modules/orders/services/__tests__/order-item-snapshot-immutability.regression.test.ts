import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * @regression order-item-snapshot-immutability-2026-05-28
 *
 * Garantit que les snapshots OrderItem (productTitle, productImageUrl, skuColor,
 * skuMaterial, skuSize, price, taxRate, taxAmount, lineTotal*, taxCategoryCode,
 * hsCode, unitCode) restent FIGÉS au moment du checkout. Aucune mutation post-
 * paiement ne doit modifier un OrderItem existant (Art. L102 B LPF — facture
 * comme données figées + Art. L123-22 C. com. — audit trail immuable).
 *
 * Cf. CLAUDE.md § "Facturation électronique — invariants" #4.
 *
 * Risque réglementaire si la garde saute : un changement de productTitle / prix
 * sur Product propagé vers OrderItem casserait la facture historique (régénération
 * d'un PDF divergent de l'archive → 503 hash mismatch, dégradation de service)
 * et invaliderait l'audit comptable Art. L123-22 (conservation 10 ans).
 *
 * Allowlist documentée :
 *  - `order-creation.service.ts` : seul écrit OrderItem (snapshot au checkout via
 *    `tx.orderItem.create` après PaymentIntent succeeded).
 *  - Les `include: { items: { ... } }` / `select: { items: { ... } }` dans les
 *    webhooks et actions sont des READS, pas des writes — exclus par le pattern.
 */

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
		const stat = statSync(full);
		if (stat.isDirectory()) {
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

const allSourceFiles = [
	...walkTs(join(REPO_ROOT, "modules")),
	...walkTs(join(REPO_ROOT, "app")),
	...walkTs(join(REPO_ROOT, "shared")),
].filter((f) => !f.includes("/app/generated/"));

function relPath(abs: string): string {
	return relative(REPO_ROOT, abs).replaceAll("\\", "/");
}

function findWriters(pattern: RegExp): string[] {
	return allSourceFiles
		.filter((f) => {
			const content = readFileSync(f, "utf-8");
			const stripped = content.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
			return pattern.test(stripped);
		})
		.map(relPath)
		.sort();
}

describe("Facturation — snapshots OrderItem immuables (Invariant #4)", () => {
	it("only order-creation.service.ts calls prisma.orderItem.create", () => {
		const writers = findWriters(/\b(?:prisma|tx)\.orderItem\.create\s*\(/);
		expect(writers).toEqual(["modules/payments/services/order-creation.service.ts"]);
	});

	it("no source file calls prisma.orderItem.update (singular)", () => {
		// Un dev pourrait écrire `prisma.orderItem.update({ where, data: { price } })`
		// pour "corriger" un prix sur une commande historique. Toute mutation = violation
		// Art. L123-22 (audit immuable). Si un nouveau use case légitime apparaît
		// (ex: post-paiement fulfillment per-item), ajouter à l'allowlist explicite.
		const writers = findWriters(/\b(?:prisma|tx)\.orderItem\.update\s*\(/);
		expect(writers).toEqual([]);
	});

	it("no source file calls prisma.orderItem.updateMany", () => {
		const writers = findWriters(/\b(?:prisma|tx)\.orderItem\.updateMany\s*\(/);
		expect(writers).toEqual([]);
	});

	it("no source file calls prisma.orderItem.upsert", () => {
		const writers = findWriters(/\b(?:prisma|tx)\.orderItem\.upsert\s*\(/);
		expect(writers).toEqual([]);
	});

	it("no source file calls prisma.orderItem.delete / deleteMany", () => {
		// Suppression d'un OrderItem = perte d'audit comptable. La conservation
		// 10 ans (Art. L102 B LPF) s'applique aussi aux lignes de facture.
		const deleted = findWriters(/\b(?:prisma|tx)\.orderItem\.(?:delete|deleteMany)\s*\(/);
		expect(deleted).toEqual([]);
	});

	it("no source file mutates a snapshot field on OrderItem via nested order.update items.update", () => {
		// Pattern Prisma : `prisma.order.update({ data: { items: { update: { ... } } } })`
		// permettrait de muter un OrderItem en passant par sa relation parente.
		// Risque tout aussi grave que `orderItem.update` direct.
		const pattern = /items\s*:\s*\{\s*(?:update|updateMany|upsert|delete|deleteMany)\b/;
		const offenders = allSourceFiles
			.filter((f) => {
				const content = readFileSync(f, "utf-8");
				const stripped = content.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
				if (!/\b(?:prisma|tx)\.order\.(?:update|upsert)\s*\(/.test(stripped)) return false;
				return pattern.test(stripped);
			})
			.map(relPath)
			.sort();
		expect(offenders).toEqual([]);
	});
});
