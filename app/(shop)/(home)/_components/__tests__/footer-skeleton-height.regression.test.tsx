/**
 * @regression footer-skeleton-height
 *
 * `FooterSkeleton` réserve la place du vrai footer pendant le stream Suspense.
 * Rien ne vérifiait cette réserve : les valeurs `1090/760/495` se présentaient
 * comme « mesurées, ~2 % au-dessus » alors que la marge réelle était NÉGATIVE
 * partout — de −35 px en desktop à −143 px en mobile (Playwright, /cgv,
 * 2026-08-05). Le commentaire décrivait un contrat que le code ne tenait plus,
 * et aucun outil ne pouvait le contredire.
 *
 * Deux causes de dérive, toutes deux invisibles en relisant le fichier :
 *
 *  1. `--bottom-bar-height` (57 px) est publiée au RUNTIME par `use-bottom-bar-height`,
 *     et `FOOTER_PADDING` l'ajoute à son `padding-bottom`. Une mesure prise avant
 *     hydratation sous-estime le footer d'exactement cette hauteur.
 *  2. Le contenu bouge (le bloc réassurance est revenu le 2026-08-05) sans que rien
 *     ne rappelle de re-mesurer.
 *
 * Ce test ne peut pas mesurer un rendu — jsdom n'applique aucune feuille Tailwind et
 * ne fait pas de layout. Il verrouille donc les deux propriétés qu'un fichier PEUT
 * porter : l'unité (rem, pas px) et le fait que chaque réserve couvre le pire cas
 * MESURÉ de sa plage, ces mesures étant inscrites ici comme référence datée.
 *
 * ⚠️ En changeant le contenu du footer, re-mesurer et mettre à jour LES DEUX côtés
 * (la constante du composant et le tableau ci-dessous). Protocole dans le docblock
 * de `FooterSkeleton`.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Hauteurs RÉELLES du footer, mesurées au navigateur sur /cgv une fois
 * `--bottom-bar-height` publiée, bannière cookies écartée.
 * Playwright/chromium, 2026-08-06, police racine à 100 %.
 *
 * ⚠️ Re-mesurées après le retrait de la signature « — Léane » et des deux
 * soulignages manuscrits (2026-08-06) : −56 px sur les TROIS plages. Les
 * valeurs d'avant étaient 1373/992/667.
 */
const MEASURED = [
	{ prefix: "", label: "< 640 px", worstCase: 1317, at: "320 px" },
	{ prefix: "sm:", label: "640-1023 px", worstCase: 936, at: "768 px" },
	{ prefix: "lg:", label: ">= 1024 px", worstCase: 611, at: "1024 px" },
] as const;

/** Marge visée au-dessus du pire cas — assez pour absorber une variation de police. */
const MIN_MARGIN = 1.0;
const MAX_MARGIN = 1.15;

const ROOT_FONT_PX = 16;

async function skeletonReserves() {
	const source = await readFile(
		path.join(process.cwd(), "app/(shop)/(home)/_components/footer.tsx"),
		"utf8",
	);
	// `min-h-[87.5rem] sm:min-h-[63.5rem] lg:min-h-[42.5rem]`
	const found = new Map<string, { raw: string; unit: string; value: number }>();
	for (const m of source.matchAll(/(sm:|lg:|md:|xl:)?min-h-\[([\d.]+)(rem|px)\]/g)) {
		found.set(m[1] ?? "", { raw: m[0]!, unit: m[3]!, value: Number(m[2]) });
	}
	return found;
}

describe("@regression footer-skeleton-height", () => {
	it("declares one reserve per measured range", async () => {
		const reserves = await skeletonReserves();

		expect(
			[...reserves.keys()].sort(),
			"FooterSkeleton doit déclarer exactement trois réserves (base, sm:, lg:).",
		).toEqual(["", "lg:", "sm:"]);
	});

	it.each(MEASURED)(
		"$label — the reserve is expressed in rem, never px",
		async ({ prefix, label }) => {
			const reserve = (await skeletonReserves()).get(prefix);

			expect(
				reserve?.unit,
				`La réserve ${label} (${reserve?.raw}) est en px. Presque tout ce qu'elle ` +
					`réserve est en rem chez Tailwind : à 200 % de police racine (WCAG 1.4.4) le ` +
					`footer double, une réserve en px reste figée. Convertir en rem ` +
					`(valeur px / ${ROOT_FONT_PX}).`,
			).toBe("rem");
		},
	);

	it.each(MEASURED)(
		"$label — the reserve covers the worst measured case ($worstCase px at $at)",
		async ({ prefix, label, worstCase, at }) => {
			const reserve = (await skeletonReserves()).get(prefix)!;
			const px = reserve.value * ROOT_FONT_PX;
			const ratio = px / worstCase;

			expect(
				ratio,
				`La réserve ${label} vaut ${reserve.raw} = ${px} px, pour un footer mesuré à ` +
					`${worstCase} px (pire cas de la plage, à ${at}). Une réserve TROP COURTE pousse ` +
					`le contenu vers le bas sous le doigt ; TROP GRANDE, elle le fait remonter. ` +
					`Re-mesurer sur /cgv après networkidle (--bottom-bar-height doit être publiée), ` +
					`puis mettre à jour la constante ET la table MEASURED de ce test.`,
			).toBeGreaterThanOrEqual(MIN_MARGIN);

			expect(ratio, `La réserve ${label} dépasse le pire cas de plus de 15 %.`).toBeLessThanOrEqual(
				MAX_MARGIN,
			);
		},
	);

	it("keeps the skeleton ranges ordered from tallest to shortest", async () => {
		const reserves = await skeletonReserves();

		// Le footer rétrécit à mesure que la largeur augmente (les zones passent de
		// empilées à côte à côte). Une réserve `lg:` plus GRANDE que la base signalerait
		// une mesure prise au mauvais breakpoint.
		expect(reserves.get("")!.value).toBeGreaterThan(reserves.get("sm:")!.value);
		expect(reserves.get("sm:")!.value).toBeGreaterThan(reserves.get("lg:")!.value);
	});
});
