import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { WISHLIST_EXPIRATION_DAYS } from "@/modules/wishlist/constants/wishlist.constants";

/**
 * Parité rétention wishlist ↔ page confidentialité.
 *
 * Le cookie `wishlist` annonce sa durée de vie à DEUX endroits de
 * `app/(legal)/confidentialite/page.tsx` (tableau de rétention + fiche du
 * cookie), en dur — la SSOT `WISHLIST_EXPIRATION_DAYS` vit, elle, dans
 * `modules/wishlist/constants/wishlist.constants.ts` et pilote le `maxAge`
 * réel (`wishlist-cookie.ts`). Avant ce contrat (audit wishlist 2026-08-19),
 * rien ne rougissait si la constante changeait sans la copie : la page légale
 * aurait menti sur la rétention effective.
 *
 * Le contrat lit la SOURCE de la page (la durée y est du JSX statique) et
 * compare le nombre AFFICHÉ à la constante — pas l'inverse : c'est la copie
 * qui doit suivre le code.
 */

const pageSource = readFileSync(
	join(process.cwd(), "app/(legal)/confidentialite/page.tsx"),
	"utf8",
);

describe("parité rétention wishlist ↔ page confidentialité", () => {
	it("le tableau de rétention affiche la durée de la SSOT", () => {
		const match = pageSource.match(/(\d+) jours \(wishlist\)/);

		expect(match, "ligne « N jours (wishlist) » introuvable dans le tableau").not.toBeNull();
		expect(Number(match?.[1])).toBe(WISHLIST_EXPIRATION_DAYS);
	});

	it("la fiche du cookie wishlist affiche la durée de la SSOT", () => {
		// Scopé au bullet `<strong>wishlist :</strong>` — les autres cookies
		// (recent-searches est aussi à 30 jours) ne doivent pas faire passer ce
		// test à leur place.
		const match = pageSource.match(
			/<strong>wishlist :<\/strong>[\s\S]{0,400}?Durée : (\d+) jours après la dernière interaction/,
		);

		expect(match, "fiche du cookie wishlist (ou sa durée) introuvable").not.toBeNull();
		expect(Number(match?.[1])).toBe(WISHLIST_EXPIRATION_DAYS);
	});
});
