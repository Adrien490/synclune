import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const hint = vi.hoisted(() => ({ show: true, lastOptions: undefined as unknown }));

vi.mock("@/shared/hooks/use-gesture-hint-once", () => ({
	useGestureHintOnce: (_key: string, options: unknown) => {
		hint.lastOptions = options;
		return hint.show;
	},
}));

import { GalleryTapHint } from "../tap-hint";

describe("GalleryTapHint", () => {
	beforeEach(() => {
		hint.show = true;
		hint.lastOptions = undefined;
	});

	afterEach(cleanup);

	it("annonce le geste au tutoiement", () => {
		render(<GalleryTapHint />);

		expect(screen.getByTestId("gallery-tap-hint")).toHaveTextContent("Appuie pour agrandir");
	});

	// Le chemin lecteur d'écran existe déjà, et dit mieux : l'`aria-label` de
	// `GalleryPinchZoom` annonce « Entrée pour ouvrir en plein écran ». Répéter
	// l'information ici en ferait une deuxième annonce concurrente — le défaut que
	// le compteur évite déjà (WCAG 4.1.3).
	it("est purement visuel : l'annonce appartient à GalleryPinchZoom", () => {
		render(<GalleryTapHint />);

		expect(screen.getByTestId("gallery-tap-hint")).toHaveAttribute("aria-hidden", "true");
	});

	it("ne se montre que sous md", () => {
		render(<GalleryTapHint />);

		expect(
			screen.getByTestId("gallery-tap-hint").className,
			"Au-delà de `md`, la loupe est visible — l'indice ferait doublon avec un bouton\n" +
				"déjà là.",
		).toContain("md:hidden");
	});

	it("ne rend rien quand le hook a déjà servi le hint", () => {
		hint.show = false;
		render(<GalleryTapHint />);

		expect(screen.queryByTestId("gallery-tap-hint")).not.toBeInTheDocument();
	});

	// ⚠️ La garde qui compte. `useGestureHintOnce` FIGE sa décision : une fois
	// `resolved` avec `show: true`, il renvoie `true` pour toute la session, et
	// repasser `enabled` à `false` ne le fait pas revenir en arrière. Sans une
	// relecture d'`enabled` au rendu, l'indice survivrait à la première ouverture
	// du plein écran — exactement le moment où il n'a plus rien à apprendre.
	it("disparaît quand enabled repasse à false, même si le hook dit encore true", () => {
		hint.show = true;
		const { rerender } = render(<GalleryTapHint enabled />);
		expect(screen.getByTestId("gallery-tap-hint")).toBeInTheDocument();

		rerender(<GalleryTapHint enabled={false} />);

		expect(screen.queryByTestId("gallery-tap-hint")).not.toBeInTheDocument();
	});

	// Le hook coupe ses hints sous `prefers-reduced-motion` pour ses appelants qui
	// ANIMENT. Celui-ci est du texte statique : le couper retirerait de
	// l'information à quelqu'un qui n'a demandé qu'à réduire le mouvement.
	it("ne se laisse pas couper par prefers-reduced-motion", () => {
		render(<GalleryTapHint />);

		expect(hint.lastOptions).toMatchObject({ respectsReducedMotion: false });
	});
});
