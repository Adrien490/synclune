/**
 * @regression tunnel-icons-are-marked-2026-08-07
 *
 * Toute icône du tunnel d'achat porte `aria-hidden` — ou un nom accessible
 * explicite quand elle véhicule vraiment une information.
 *
 * ## Le bug que ce test verrouille
 *
 * `@phosphor-icons/react/ssr` n'ajoute **ni `aria-hidden`, ni `role`, ni
 * `focusable`** — vérifié dans `SSRBase.es.js`, qui ne rend un `<title>` que si
 * une prop `alt` est fournie. Une icône Phosphor sans marquage explicite est donc
 * un `<svg>` sans nom ni rôle : selon le moteur, il s'annonce « graphique » ou
 * disparaît.
 *
 * 23 icônes du tunnel étaient dans ce cas au 2026-08-07 — dont les trois marques
 * de carte du récapitulatif, qui répondent pourtant à une vraie question (« ma
 * carte est-elle acceptée ? ») et sont désormais nommées **en groupe**, une seule
 * fois. Le reste du dépôt marquait bien ses icônes : l'incohérence était locale.
 *
 * ⚠️ Ce test ne demande pas « `aria-hidden` partout ». Une icône qui porte de
 * l'information doit être NOMMÉE (`aria-label`, `role`, `alt`) — c'est le
 * silence par défaut qui est le défaut.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..", "..", "..");
const SCAN_DIRS = ["app/paiement", "modules/payments", "modules/cart"];

function collect(dir: string, acc: string[] = []): string[] {
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) {
			if (entry === "__tests__") continue;
			collect(full, acc);
			continue;
		}
		if (/\.tsx$/.test(entry) && !/\.(test|spec)\.tsx$/.test(entry)) acc.push(full);
	}
	return acc;
}

const files = SCAN_DIRS.flatMap((dir) => collect(join(ROOT, dir)));

/** `<XxxIcon … />` — la convention de nommage Phosphor du dépôt. */
const ICON_TAG = /<([A-Z][A-Za-z0-9]*Icon)\b([^>]*?)\/>/g;

/** Composants maison dont le marquage vit dans leur propre fichier. */
const WRAPPERS = new Set(["SuccessIcon"]);

describe("Icônes du tunnel", () => {
	it("scanne bien les trois zones", () => {
		expect(files.length).toBeGreaterThan(25);
		expect(files.some((f) => f.endsWith("pay-button.tsx"))).toBe(true);
		expect(files.some((f) => f.endsWith("cart-sheet.tsx"))).toBe(true);
	});

	it("aucune icône sans `aria-hidden` ni nom accessible", () => {
		const offenders: string[] = [];

		for (const file of files) {
			const source = readFileSync(file, "utf8");
			for (const match of source.matchAll(ICON_TAG)) {
				const [, name, attrs] = match;
				if (!name || WRAPPERS.has(name)) continue;
				if (/aria-hidden|aria-label|aria-labelledby|role=|alt=/.test(attrs ?? "")) continue;

				const line = source.slice(0, match.index).split("\n").length;
				offenders.push(`${file.slice(ROOT.length + 1)}:${line} <${name}>`);
			}
		}

		expect(
			offenders,
			"Phosphor n'ajoute aucun attribut a11y : une icône non marquée est un " +
				"<svg> sans nom ni rôle. Ajouter `aria-hidden` (décoratif) ou un nom.",
		).toEqual([]);
	});

	it("les marques de carte sont nommées UNE fois, par leur groupe", () => {
		const summary = readFileSync(
			join(ROOT, "modules/payments/components/checkout-summary.tsx"),
			"utf8",
		);

		expect(summary).toMatch(/role="img"\s+aria-label="Cartes acceptées[^"]*"/);
		// …et les trois icônes se taisent, sinon on annonce quatre fois.
		for (const icon of ["VisaIcon", "MastercardIcon", "CBIcon"]) {
			expect(summary).toMatch(new RegExp(`<${icon}[^>]*aria-hidden="true"`));
		}
	});
});
