/**
 * @regression vat-progress-card-majored-threshold
 *
 * La carte de suivi du seuil TVA ne doit pas annoncer la conséquence du seuil
 * MAJORÉ au franchissement du seuil de BASE.
 *
 * ## Le bug que ce test verrouille
 *
 * `VatProgressCard` avait deux états seulement, et basculait en `critical` dès
 * 100 % du seuil de base (85 000 €) avec le sous-titre « Seuil dépassé —
 * bascule TVA applicable au 1er du mois en cours » (tooltip idem).
 *
 * C'est faux. Art. 293 B CGI, les deux seuils n'ont pas la même conséquence :
 *
 * - **seuil de base** (85 000 € biens) franchi en cours d'année N → la franchise
 *   reste acquise jusqu'au 31 décembre ; elle n'est perdue au 1ᵉʳ janvier que si
 *   le dépassement se confirme ;
 * - **seuil majoré** (93 500 €) franchi → la franchise cesse immédiatement, TVA
 *   due dès le 1ᵉʳ jour du **mois de dépassement**.
 *
 * Double défaut : à 85 001 € la carte donnait une consigne opérationnelle fausse
 * (facturer la TVA et régulariser le mois en cours), et **rien** ne signalait
 * 93 500 € — au-delà de 100 % l'état ne changeait plus, donc le franchissement
 * réellement urgent était indiscernable du bénin. Audit « Franchise TVA
 * micro-entreprise » 2026-07-27.
 */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { VatProgressCard } from "../vat-progress-card";

const THRESHOLD = 8_500_000; // 85 000 € en cents
const MAJORED = 9_350_000; // 93 500 € en cents

function renderCard(ytdRevenue: number) {
	return render(
		<VatProgressCard
			data={{
				ytdRevenue,
				threshold: THRESHOLD,
				majoredThreshold: MAJORED,
				progress: (ytdRevenue / THRESHOLD) * 100,
				year: 2026,
			}}
		/>,
	);
}

afterEach(cleanup);

describe("@regression vat-progress-card-majored-threshold", () => {
	it("entre le seuil de base et le majoré : n'annonce PAS de TVA due ce mois-ci", () => {
		// 90 000 € — au-dessus de 85 000, en dessous de 93 500. La franchise est
		// intacte : c'est le cas que l'ancienne carte traitait en « critical ».
		renderCard(9_000_000);

		expect(screen.getByText(/Seuil de base dépassé/)).toBeInTheDocument();
		expect(screen.queryByText(/1er du mois/)).not.toBeInTheDocument();
		expect(screen.queryByText(/Seuil majoré dépassé/)).not.toBeInTheDocument();
	});

	it("au-delà du seuil majoré : annonce la TVA due depuis le 1er du mois", () => {
		renderCard(9_400_000); // 94 000 € > 93 500 €

		expect(
			screen.getByText(/Seuil majoré dépassé — TVA due depuis le 1er du mois/),
		).toBeInTheDocument();
	});

	it("pile sur le seuil de base : déjà « dépassé » (le seuil est inclusif)", () => {
		renderCard(THRESHOLD);

		expect(screen.getByText(/Seuil de base dépassé/)).toBeInTheDocument();
	});

	it("pile sur le seuil majoré : bascule en « majoré dépassé »", () => {
		renderCard(MAJORED);

		expect(screen.getByText(/Seuil majoré dépassé/)).toBeInTheDocument();
	});

	it("sous 80 % : aucun libellé de dépassement", () => {
		renderCard(1_500_000); // ~17,6 %

		expect(screen.queryByText(/dépassé/)).not.toBeInTheDocument();
		expect(screen.getByText(/restants avant le seuil/)).toBeInTheDocument();
	});

	it("entre 80 % et le seuil : pré-alerte, sans annonce de bascule", () => {
		renderCard(7_000_000); // ~82,4 %

		expect(screen.getByText(/Plus que .* avant le seuil de base/)).toBeInTheDocument();
		expect(screen.queryByText(/dépassé/)).not.toBeInTheDocument();
	});
});
