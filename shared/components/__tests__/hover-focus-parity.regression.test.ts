/**
 * @regression hover-focus-parity
 *
 * WCAG 2.4.7 / 2.1.1 : tout ce qui n'existe qu'au **survol** doit exister au
 * **focus clavier**. Un utilisateur au clavier ne doit pas perdre une affordance
 * (soulignement de lien, chevron de navigation, bouton de suppression qui
 * s'éclaircit) que l'utilisateur souris reçoit.
 *
 * Audit responsive 2026-07-26, P2 — cinq composants révélaient une affordance au
 * survol sans équivalent focus : `filter-badge` (le « × » restait à `opacity-60`
 * au clavier), `kpi-card` (chevron « cette carte navigue »),
 * `dialog` et `sheet` (bouton
 * fermer atténué même avec le focus dessus).
 *
 * ## Portée volontairement étroite
 *
 * Ce test ne scanne PAS tout le repo : un `group-hover:scale-105` sur une image
 * décorative n'a aucun équivalent focus à fournir, et un garde-fou qui hurle sur
 * chaque effet cosmétique serait désactivé en une semaine. Il verrouille les
 * composants où l'audit a identifié une affordance **porteuse d'information**,
 * et sert de liste à étendre quand un nouveau cas apparaît.
 *
 * Le gate `can-hover:` (`@media (hover: hover) and (pointer: fine)`, cf.
 * `app/globals.css`) existe pour neutraliser le sticky-hover iOS. Il s'applique
 * au survol seul : le focus clavier existe aussi sur les appareils tactiles, et
 * une règle de focus derrière `can-hover:` ne s'appliquerait jamais sur mobile.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "..", "..", "..");

interface Guard {
	/** Chemin relatif au repo. */
	file: string;
	/** Ce que l'affordance communique — sert de message d'erreur. */
	affordance: string;
	/** Fragment de classe hover à repérer. */
	hover: string;
	/** Fragment de classe focus qui doit l'accompagner. */
	focus: string;
}

const GUARDS: readonly Guard[] = [
	{
		file: "shared/components/filter-badge.tsx",
		affordance: "le « × » de suppression du filtre s'éclaircit",
		hover: "can-hover:group-hover:opacity-100",
		focus: "group-focus-visible:opacity-100",
	},
	{
		file: "modules/dashboard/components/kpi-card.tsx",
		affordance: "le chevron indique que la carte KPI navigue",
		hover: "group-hover:text-primary",
		focus: "group-focus-within:text-primary",
	},
	{
		file: "shared/components/ui/dialog.tsx",
		affordance: "le bouton Fermer passe en pleine opacité",
		hover: "hover:opacity-100",
		focus: "focus-visible:opacity-100",
	},
	{
		file: "shared/components/ui/sheet.tsx",
		affordance: "le bouton Fermer passe en pleine opacité",
		hover: "hover:opacity-100",
		focus: "focus-visible:opacity-100",
	},
];

describe("@regression hover-focus-parity", () => {
	for (const { file, affordance, hover, focus } of GUARDS) {
		describe(file, () => {
			const source = readFileSync(join(REPO_ROOT, file), "utf-8");

			// Sanity : si le refactor renomme la classe hover, le test doit le dire
			// plutôt que de passer à vide.
			it(`déclare encore l'effet de survol (${hover})`, () => {
				expect(
					source.includes(hover),
					`${hover} introuvable — l'effet a été renommé/retiré, mettre à jour ce garde-fou`,
				).toBe(true);
			});

			it(`fournit l'équivalent focus clavier : ${affordance}`, () => {
				expect(
					source.includes(focus),
					`Affordance au survol sans équivalent focus (WCAG 2.4.7) : ${affordance}.\n` +
						`Ajouter \`${focus}\` à côté de \`${hover}\`.`,
				).toBe(true);
			});
		});
	}

	it("ne place jamais une règle de focus derrière le gate can-hover", () => {
		// `can-hover:` = `(hover: hover) and (pointer: fine)`. Une règle de focus
		// derrière ce gate ne s'applique jamais au clavier sur tactile — et c'est
		// invisible à la relecture.
		const offenders: string[] = [];

		for (const { file } of GUARDS) {
			const lines = readFileSync(join(REPO_ROOT, file), "utf-8").split("\n");
			lines.forEach((line, index) => {
				if (/can-hover:(group-)?focus/.test(line)) {
					offenders.push(`${file}:${index + 1} — ${line.trim().slice(0, 120)}`);
				}
			});
		}

		expect(
			offenders,
			"`can-hover:` sur une règle de focus : elle ne s'appliquera jamais sur tactile.\n" +
				offenders.join("\n"),
		).toEqual([]);
	});
});
