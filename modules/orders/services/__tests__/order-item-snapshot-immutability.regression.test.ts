import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * @regression order-item-snapshot-immutability-2026-05-28
 *
 * Garantit que les snapshots OrderItem (productTitle, productImageUrl, skuColor,
 * skuMaterial, skuSize, price, quantity) restent FIGÉS au moment du checkout.
 * Aucune mutation post-paiement ne doit modifier un OrderItem existant
 * (Art. L102 B LPF — facture comme données figées + Art. L123-22 C. com. —
 * audit trail immuable).
 *
 * Le fichier a DEUX moitiés, sur le patron d'`order-history-immutability` :
 * une moitié « schéma » (la table est structurellement un snapshot : ni
 * `updatedAt`, ni `deletedAt`, ni pointeur `productId`, largeurs de colonnes
 * calées sur la troncature applicative) et une moitié « code » (allowlist des
 * writers, scan du dépôt).
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

// ⚠️ `prisma/` et `scripts/` sont dans le périmètre depuis l'audit 2026-08-07.
// Ils en étaient absents par accident de portée, pas par décision : un
// `scripts/fix-order-prices.ts` faisant `orderItem.updateMany` — exactement le
// genre de script de dépannage qu'on écrit sous pression — n'aurait déclenché
// aucune assertion. Le seul writer légitime hors `modules/` est le seed, qui est
// allowlisté nommément ci-dessous.
const allSourceFiles = [
	...walkTs(join(REPO_ROOT, "modules")),
	...walkTs(join(REPO_ROOT, "app")),
	...walkTs(join(REPO_ROOT, "shared")),
	...walkTs(join(REPO_ROOT, "prisma")),
	...walkTs(join(REPO_ROOT, "scripts")),
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

const SCHEMA = readFileSync(join(REPO_ROOT, "prisma", "schema.prisma"), "utf-8");

function extractModel(name: string): string {
	const match = SCHEMA.match(new RegExp(`model\\s+${name}\\s*\\{([\\s\\S]*?)\\n\\}`));
	if (!match?.[1]) throw new Error(`Model ${name} introuvable dans schema.prisma`);
	return match[1];
}

/** Largeur déclarée d'une colonne `@db.VarChar(n)` du modèle OrderItem. */
function varCharWidth(column: string): number {
	const model = extractModel("OrderItem");
	const match = model.match(new RegExp(`^\\s*${column}\\s+\\S+\\s+@db\\.VarChar\\((\\d+)\\)`, "m"));
	if (!match?.[1]) throw new Error(`Colonne ${column} sans @db.VarChar dans OrderItem`);
	return Number(match[1]);
}

describe("Facturation — le SCHÉMA OrderItem est une table de snapshot (Invariant #4)", () => {
	it("OrderItem n'a ni updatedAt ni deletedAt", () => {
		// Une table de snapshot ne se met pas à jour et ne s'archive pas : elle
		// naît au checkout et vit 10 ans (Art. L102 B LPF). L'absence de ces deux
		// colonnes est ce qui rend l'invariant STRUCTUREL et pas seulement
		// conventionnel — mais rien ne la verrouillait, alors que le pendant
		// `OrderHistory` a cette assertion depuis toujours.
		const model = extractModel("OrderItem");
		expect(model).not.toMatch(/^\s*updatedAt\b/m);
		expect(model).not.toMatch(/^\s*deletedAt\b/m);
		expect(model).toMatch(/^\s*createdAt\b/m);
	});

	it("OrderItem ne porte aucune relation vers Product", () => {
		// `productId` a été retiré à l'audit schéma V2 précisément parce qu'un
		// pointeur VIVANT n'a rien à faire dans une table de snapshot : il invite
		// à joindre, et un join rend la donnée COURANTE sur une commande passée.
		// `skuId` subsiste (restock, `onDelete: Restrict`), les colonnes `product*`
		// portent tout ce que la commande doit conserver.
		const model = extractModel("OrderItem");
		expect(model).not.toMatch(/^\s*productId\b/m);
		expect(model).not.toMatch(/^\s*product\s+Product\b/m);
	});

	it("la troncature applicative est calée sur la largeur réelle des colonnes", () => {
		// `skuColor` et `skuMaterial` sont AGRÉGÉS (plusieurs noms joints par « · »),
		// donc tronqués par `truncateSkuLabel` avant écriture. Si le littéral du
		// service et la largeur de colonne divergent, le symptôme est un `22001`
		// Postgres levé DANS la transaction de checkout : commande refusée, message
		// générique, aucun champ nommé. Ni `tsc` ni les tests d'intégration ne
		// voient ce trou — `zod-prisma-length-parity` non plus, il ne couvre que
		// les schémas Zod et OrderItem n'en a pas (il dérive de lectures DB).
		const service = readFileSync(
			join(REPO_ROOT, "modules", "payments", "services", "order-creation.service.ts"),
			"utf-8",
		);
		const literal = service.match(/SKU_LABEL_SNAPSHOT_MAX_LENGTH\s*=\s*(\d+)/);
		expect(literal?.[1], "SKU_LABEL_SNAPSHOT_MAX_LENGTH introuvable").toBeDefined();

		expect(Number(literal![1])).toBe(varCharWidth("skuColor"));
		expect(Number(literal![1])).toBe(varCharWidth("skuMaterial"));
	});

	it("les colonnes non agrégées sont bornées en amont, à la largeur exacte", () => {
		// `productTitle` et `skuSize` ne sont PAS tronqués à l'écriture : ils sont
		// recopiés tels quels. C'est sûr uniquement tant que leur borne Zod amont
		// (validation-limits) égale la largeur de colonne. Élargir la colonne
		// source sans élargir celle-ci rouvrirait le même 22001.
		expect(varCharWidth("productTitle")).toBe(200);
		expect(varCharWidth("skuSize")).toBe(50);
		expect(varCharWidth("productImageUrl")).toBe(2048);
	});
});

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

	it("only prisma/seed.ts calls prisma.orderItem.delete / deleteMany", () => {
		// Suppression d'un OrderItem = perte d'audit comptable. La conservation
		// 10 ans (Art. L102 B LPF) s'applique aussi aux lignes de facture.
		//
		// `prisma/seed.ts` est la SEULE entrée : son `deleteMany` remet à zéro une
		// base de DÉVELOPPEMENT avant re-seed, derrière le garde `SEED_CLEANUP`.
		// Il n'y a pas de chemin de production vers ce fichier — mais il fallait
		// l'écrire, pas le laisser hors périmètre de scan comme il l'était.
		const deleted = findWriters(/\b(?:prisma|tx)\.orderItem\.(?:delete|deleteMany)\s*\(/);
		expect(deleted).toEqual(["prisma/seed.ts"]);
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
