import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { GalleryCounter } from "../counter";

/**
 * Ce fichier avait été supprimé le 2026-08-03 au motif « rendu pur » (élagage
 * 87a405b2b). Le composant a gagné DEUX contrats depuis, et aucun des deux n'est
 * visible à la relecture :
 *
 * 1. `aria-hidden="true"` est la moitié d'un contrat WCAG 4.1.3. L'autre moitié
 *    est l'unique région `aria-live` de `modules/media/components/gallery/gallery.tsx`
 *    (« Image {n} sur {total} »). Deux annonces de la même information en valent
 *    zéro : retirer `aria-hidden` ici rend la galerie bavarde, et rien d'autre
 *    dans la suite ne le voit.
 * 2. `data-testid="gallery-counter"` est la cible DIRECTE de
 *    `e2e/product-gallery.spec.ts` — assumé précisément parce que `aria-hidden`
 *    rend le compteur invisible à tout sélecteur accessible. Le renommer casse
 *    un test Playwright `@critical`, à ~15 min de feedback.
 */
describe("GalleryCounter", () => {
	afterEach(cleanup);

	it("affiche la vue courante en base 1 sur le total", () => {
		render(<GalleryCounter current={2} total={7} />);

		expect(screen.getByTestId("gallery-counter")).toHaveTextContent("3 / 7");
	});

	it("la première vue s'affiche « 1 », pas « 0 »", () => {
		render(<GalleryCounter current={0} total={3} />);

		expect(screen.getByTestId("gallery-counter")).toHaveTextContent("1 / 3");
	});

	it("est masqué aux lecteurs d'écran (l'annonce appartient à la région live de gallery.tsx)", () => {
		render(<GalleryCounter current={0} total={4} />);

		expect(
			screen.getByTestId("gallery-counter"),
			"Le compteur doit rester `aria-hidden`. `gallery.tsx` porte déjà une région\n" +
				"`role=status aria-live=polite` qui annonce « Image N sur M » — deux annonces de\n" +
				"la même information en valent zéro (WCAG 4.1.3).",
		).toHaveAttribute("aria-hidden", "true");
	});

	it("expose le testid dont dépend e2e/product-gallery.spec.ts", () => {
		const { container } = render(<GalleryCounter current={0} total={4} />);

		expect(
			container.querySelector('[data-testid="gallery-counter"]'),
			'`data-testid="gallery-counter"` est la seule prise de l\'e2e sur ce composant :\n' +
				"`aria-hidden` le rend introuvable par rôle ou par texte accessible. Le renommer\n" +
				"casse `e2e/product-gallery.spec.ts` (@critical).",
		).not.toBeNull();
	});
});
