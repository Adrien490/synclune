import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ResultCountLiveRegion } from "../result-count-live-region";

afterEach(cleanup);

describe("ResultCountLiveRegion", () => {
	it("reste muette sans requête active", () => {
		render(<ResultCountLiveRegion totalCount={37} singular="produit" plural="produits" />);

		expect(screen.getByRole("status")).toHaveTextContent("");
	});

	it("reste muette pour une requête vide ou blanche", () => {
		render(
			<ResultCountLiveRegion totalCount={37} query="   " singular="produit" plural="produits" />,
		);

		expect(screen.getByRole("status")).toHaveTextContent("");
	});

	it("annonce l'absence de résultat au singulier", () => {
		render(
			<ResultCountLiveRegion totalCount={0} query="zzz" singular="produit" plural="produits" />,
		);

		expect(screen.getByRole("status")).toHaveTextContent("Aucun produit pour « zzz »");
	});

	it("annonce un résultat au singulier", () => {
		render(
			<ResultCountLiveRegion totalCount={1} query="bague" singular="produit" plural="produits" />,
		);

		expect(screen.getByRole("status")).toHaveTextContent("1 produit pour « bague »");
	});

	it("annonce plusieurs résultats au pluriel", () => {
		render(
			<ResultCountLiveRegion totalCount={37} query="bague" singular="produit" plural="produits" />,
		);

		expect(screen.getByRole("status")).toHaveTextContent("37 produits pour « bague »");
	});

	it("est une live region sr-only polie et atomique", () => {
		render(
			<ResultCountLiveRegion totalCount={5} query="bague" singular="produit" plural="produits" />,
		);

		const region = screen.getByRole("status");
		expect(region).toHaveAttribute("aria-live", "polite");
		expect(region).toHaveAttribute("aria-atomic", "true");
		expect(region).toHaveClass("sr-only");
	});

	/**
	 * L'assertion centrale du design. Une live region ne parle que si son contenu
	 * CHANGE. En ne dépendant que de (query, totalCount) — jamais de la taille de
	 * page — paginer à l'intérieur d'une même requête produit un texte identique,
	 * donc aucune annonce, donc aucune collision avec la live region de
	 * `CursorPagination` (dont la décision « pas de live region » d'
	 * `AdminListLiveCount` dépendait).
	 */
	it("produit un texte identique quelle que soit la page courante", () => {
		const { rerender } = render(
			<ResultCountLiveRegion totalCount={37} query="bague" singular="produit" plural="produits" />,
		);
		const first = screen.getByRole("status").textContent;

		// Une navigation de page ne change ni la requête ni le total.
		rerender(
			<ResultCountLiveRegion totalCount={37} query="bague" singular="produit" plural="produits" />,
		);

		expect(screen.getByRole("status").textContent).toBe(first);
	});

	/**
	 * Le défaut d'origine : la région disparaissait quand la liste passait à zéro
	 * résultat (early-return) et réapparaissait déjà remplie — une région montée
	 * en même temps que son texte n'est pas annoncée. Ici le NŒUD doit survivre.
	 */
	it("met à jour son texte sans se démonter quand le total change", () => {
		const { rerender } = render(
			<ResultCountLiveRegion totalCount={37} query="bague" singular="produit" plural="produits" />,
		);
		const node = screen.getByRole("status");

		rerender(
			<ResultCountLiveRegion totalCount={0} query="bague" singular="produit" plural="produits" />,
		);

		expect(node.isConnected).toBe(true);
		expect(screen.getByRole("status")).toBe(node);
		expect(node).toHaveTextContent("Aucun produit pour « bague »");
	});
});
