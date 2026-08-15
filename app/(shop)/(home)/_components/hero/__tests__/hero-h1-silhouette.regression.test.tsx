import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { HeroHeading } from "../hero-heading";

/**
 * @regression hero-h1-silhouette
 *
 * La silhouette en deux lignes du h1 de l'étal — césure à la virgule — n'existait
 * qu'à 390 et 1280 px, les deux largeurs des audits précédents (carte des césures
 * mesurée à 11 largeurs au rendu réel, audit 2026-08-06) :
 *
 * - **320 px** : la virgule passait SEULE en tête de ligne 2 (« ⏎ , faits un par
 *   un »). Cause : le span racine de `BrushHighlight` est `inline-block`, une
 *   boîte ATOMIQUE pour la césure — le moteur a le droit de couper entre la boîte
 *   et la ponctuation qui la suit, ce qu'il ne ferait jamais dans « colorés, » en
 *   texte nu.
 * - **480 px et 768–1023 px** : veuve « par un » — la promesse d'unicité, seule
 *   raison d'acheter tout de suite sur des pièces uniques, coupée en son milieu.
 * - **640–767 px** : bannière d'une seule ligne — le trou d'un breakpoint entier
 *   dans l'ancienne borne `md:max-w-[20ch]`, dont le JSDoc (« inopérante sous md,
 *   20ch > la colonne ») était faux sur cette plage (colonne à 592–719 px).
 *
 * Un test jsdom ne layoute pas : on verrouille donc le MÉCANISME (les deux
 * groupes insécables + la borne non gatée), pas la césure rendue — celle-ci a été
 * re-mesurée le 2026-08-06 : deux lignes à la virgule de 360 à 1280 px, trois
 * lignes propres à 320.
 */

afterEach(cleanup);

describe("HeroHeading — silhouette du h1 (mécanisme)", () => {
	it("soude « colorés » à sa virgule : la boîte atomique du surligneur ne peut plus l'orpheliner", () => {
		render(<HeroHeading id="hero-title" />);

		const brush = screen
			.getByRole("heading", { level: 1 })
			.querySelector("[data-slot='brush-highlight']");
		expect(brush).not.toBeNull();

		// Le wrapper insécable contient le surligneur ET la virgule — retirer l'un
		// des deux rouvre la coupe « colorés ⏎ , » à 320 px.
		const group = brush!.closest(".whitespace-nowrap");
		expect(group).not.toBeNull();
		expect(group!.textContent).toBe("colorés,");
	});

	it("soude « faits un par un » : la promesse d'unicité ne se coupe plus en veuve", () => {
		render(<HeroHeading id="hero-title" />);

		// ⚠️ Mécanisme AMENDÉ au lot 7 (WCAG 1.4.4) : la soudure passe par des
		// espaces INSÉCABLES + `wrap-anywhere`, plus par `whitespace-nowrap`.
		// Même anti-veuve à toutes les largeurs normales, mais un nowrap
		// interdisait toute césure : à 200% de zoom texte le groupe (~560px au
		// corps 80) mettait un scroll horizontal à la page entière sur mobile —
		// attrapé par zoom-a11y.spec. `overflow-wrap: anywhere` ne coupe qu'en
		// dernier recours. (« colorés, » garde SON nowrap : un nbsp ne soude pas
		// une boîte inline-block à sa virgule, et le groupe tient à 200%.)
		const h1 = screen.getByRole("heading", { level: 1 });
		const groups = Array.from(h1.querySelectorAll(".wrap-anywhere")).map(
			(group) => group.textContent,
		);
		expect(groups).toContain("faits\u00A0un\u00A0par\u00A0un");

		// …sans altérer ce que lit un lecteur d'écran ni un test de contenu
		// (les nbsp sont des blancs pour la lecture — on les normalise).
		expect(h1.textContent.replace(/\u00A0/g, " ")).toBe("Des bijoux colorés, faits un par un");
	});
});
