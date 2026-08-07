import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * @regression delivery-estimator-server-only-2026-08-07
 *
 * `DeliveryEstimator` lit l'horloge (`new Date()`) pendant son rendu pour dériver
 * la fenêtre de livraison. Tant qu'il était monté par `ProductDetails`
 * (`"use client"`), ce rendu était dans le graphe client : SSR et hydratation
 * pouvaient tomber de part et d'autre de minuit, et le React Compiler recevait une
 * valeur impure — sans `suppressHydrationWarning`, contrairement aux trois autres
 * lectures d'horloge du dépôt qui sont toutes assumées explicitement.
 *
 * Il est désormais monté par le Server Component `app/(shop)/creations/[slug]/page.tsx`
 * et relayé en `ReactNode` (prop `deliveryEstimate`). Ce test empêche la rechute,
 * qui serait invisible : un `import` depuis un composant client compile, s'affiche,
 * et ne se trahit qu'en console un jour sur trente.
 */

const REPO_ROOT = process.cwd();
const SCAN_ROOTS = ["app", "modules", "shared"].map((d) => join(REPO_ROOT, d));

function walk(dir: string, out: string[] = []): string[] {
	let entries: string[];
	try {
		entries = readdirSync(dir);
	} catch {
		return out;
	}
	for (const entry of entries) {
		if (entry === "node_modules" || entry === "__tests__" || entry.startsWith(".")) continue;
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) {
			walk(full, out);
		} else if (entry.endsWith(".tsx") && !entry.endsWith(".test.tsx")) {
			out.push(full);
		}
	}
	return out;
}

describe("DeliveryEstimator reste un Server Component", () => {
	const files = SCAN_ROOTS.flatMap((root) => walk(root));

	it("le composant lui-même ne porte pas `use client`", () => {
		const source = readFileSync(
			join(REPO_ROOT, "modules/products/components/delivery-estimator.tsx"),
			"utf-8",
		);

		expect(source).not.toMatch(/^\s*["']use client["']/m);
	});

	it("aucun fichier `use client` ne l'importe", () => {
		const offenders = files
			.filter((file) => {
				const source = readFileSync(file, "utf-8");
				if (!/^\s*["']use client["']/m.test(source)) return false;
				// Commentaires strippés : `product-details.tsx` DÉCRIT le composant dans
				// sa JSDoc de prop sans l'importer, et c'est exactement ce qu'on veut.
				const stripped = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
				return /import[^;]*\bDeliveryEstimator\b/.test(stripped);
			})
			.map((file) => relative(REPO_ROOT, file).replaceAll("\\", "/"));

		expect(offenders).toEqual([]);
	});

	it("la page produit le monte et le passe en prop", () => {
		const page = readFileSync(join(REPO_ROOT, "app/(shop)/creations/[slug]/page.tsx"), "utf-8");

		expect(page).toContain("deliveryEstimate={<DeliveryEstimator />}");
	});
});
