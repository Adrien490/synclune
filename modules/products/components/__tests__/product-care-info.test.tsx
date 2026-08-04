import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ProductCareInfo } from "../product-care-info";

afterEach(cleanup);

describe("ProductCareInfo", () => {
	it("affiche les conseils d'entretien SANS clic — plus d'accordéon replié", () => {
		render(<ProductCareInfo />);

		// C'est le seul endroit de la fiche où Léane parle. Il vivait sous un
		// accordéon dont seule la section « Livraison » s'ouvrait par défaut : le
		// mot de l'artisane était caché derrière un clic, sous des frais de port.
		expect(screen.queryByRole("button")).not.toBeInTheDocument();
		expect(screen.getByRole("heading", { name: /Comment en prendre soin/i })).toBeVisible();
		expect(screen.getByText(/Range-le dans son petit écrin/i)).toBeVisible();
	});

	it("tutoie, conformément à la convention de voix du dépôt", () => {
		render(<ProductCareInfo />);

		expect(screen.getByText(/Évite l'eau, les parfums/i)).toBeInTheDocument();
		expect(screen.getByText(/prends-en soin et il te le rendra/i)).toBeInTheDocument();

		// Les formes vouvoyées d'origine ne doivent pas revenir.
		expect(screen.queryByText(/votre produit/i)).not.toBeInTheDocument();
		expect(screen.queryByText(/vous le rendra/i)).not.toBeInTheDocument();
	});

	it("est signé — c'est ce qui en fait un mot et pas un encart", () => {
		render(<ProductCareInfo />);

		expect(screen.getByText("— Léane")).toBeInTheDocument();
	});

	it("ne duplique plus les tarifs de livraison de ProductReassurance", () => {
		render(<ProductCareInfo />);

		// La section « Livraison » de l'accordéon répétait mot pour mot les tarifs
		// déjà affichés au-dessus par `ProductReassurance`.
		expect(screen.queryByText(/France métropolitaine/i)).not.toBeInTheDocument();
		expect(screen.queryByText(/Union Européenne/i)).not.toBeInTheDocument();
	});

	it("ajoute le conseil argent quand le matériau contient « argent »", () => {
		render(<ProductCareInfo primaryMaterial="Argent 925" />);

		expect(screen.getByText(/chiffon anti-oxydation/i)).toBeInTheDocument();
	});

	it("ajoute le conseil or quand le matériau contient « or »", () => {
		render(<ProductCareInfo primaryMaterial="Plaqué or" />);

		expect(screen.getByText(/eau tiède avec un peu de savon/i)).toBeInTheDocument();
	});

	it("n'affiche aucun conseil spécifique sans matériau", () => {
		render(<ProductCareInfo />);

		expect(screen.queryByText(/chiffon anti-oxydation/i)).not.toBeInTheDocument();
		expect(screen.queryByText(/eau tiède avec un peu de savon/i)).not.toBeInTheDocument();
	});
});
