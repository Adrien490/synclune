/**
 * Le carton d'étal — les quatre états portés par le MÊME objet.
 *
 * Direction « Le carton d'étal » (artifact du 2026-08-05, reco C). Ce qui est
 * vérifié ici n'est pas l'apparence mais les invariants qui la rendent honnête :
 * un état d'échec qui reste à l'écran, une fin de catalogue qui n'est plus une
 * cible clavier morte, et des accords au singulier.
 */

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { EtalCard } from "../etal-card";

afterEach(cleanup);

type Overrides = Partial<React.ComponentProps<typeof EtalCard>>;

function renderCard(overrides: Overrides = {}) {
	const onLoad = vi.fn();
	render(
		<EtalCard
			displayedCount={20}
			totalCount={62}
			remainingCount={42}
			loadCount={0}
			isPending={false}
			error={null}
			hasMore
			onLoad={onLoad}
			ref={() => {}}
			{...overrides}
		/>,
	);
	return { onLoad };
}

function slot(): HTMLElement {
	return document.querySelector("[data-slot='etal-card']") as HTMLElement;
}

describe("EtalCard", () => {
	describe("au repos", () => {
		it("annonce ce qu'il RESTE, pas ce qui est affiché", async () => {
			renderCard();

			const button = screen.getByRole("button");
			// Le compte du bloc titre dit « 62 pièces en ligne » ; le carton dit ce
			// qu'il reste à sortir — les deux ne se répètent pas.
			expect(button).toHaveTextContent("42");
			expect(button).toHaveTextContent("pièces encore dans le tiroir");
			expect(button).toHaveTextContent("Touche pour les sortir");
		});

		it("accorde au singulier quand il ne reste qu'une pièce", () => {
			renderCard({ remainingCount: 1, displayedCount: 61 });

			const button = screen.getByRole("button");
			expect(button).toHaveTextContent("pièce encore dans le tiroir");
			expect(button).toHaveTextContent("Touche pour la sortir");
			expect(button).not.toHaveTextContent("Touche pour les sortir");
		});

		it("ne promet pas de chiffre quand le total est inconnu", () => {
			renderCard({ totalCount: 0, remainingCount: 0 });

			const button = screen.getByRole("button");
			expect(button).toHaveTextContent("Encore");
			expect(button).toHaveTextContent("des pièces dans le tiroir");
		});

		it("déclenche le chargement à l'activation", async () => {
			const user = userEvent.setup();
			const { onLoad } = renderCard();

			await user.click(screen.getByRole("button"));
			expect(onLoad).toHaveBeenCalledTimes(1);
		});
	});

	describe("en vol", () => {
		it("porte aria-busy et aria-disabled, mais reste FOCALISABLE", async () => {
			renderCard({ isPending: true });

			const button = screen.getByRole("button");
			expect(button).toHaveAttribute("aria-busy", "true");
			expect(button).toHaveAttribute("aria-disabled", "true");
			// ⚠️ Surtout PAS `disabled` : un bouton désactivé alors qu'il a le focus
			// le renvoie sur `<body>`, et l'utilisateur au clavier repart du premier
			// lien de la page. La garde contre le double-dispatch vit dans `LoadMore`.
			expect(button).not.toBeDisabled();
			button.focus();
			expect(document.activeElement).toBe(button);
		});

		it("dit ce qu'il fait, à la première personne", () => {
			renderCard({ isPending: true });
			expect(screen.getByRole("button")).toHaveTextContent("je vais les chercher");
		});
	});

	describe("en échec", () => {
		it("garde le message à l'écran et reste activable", async () => {
			const user = userEvent.setup();
			const { onLoad } = renderCard({ error: "Trop de requêtes." });

			const button = screen.getByRole("button");
			// C'est ce qui remplace le toast : l'auto-load ne rejoue jamais un
			// curseur consommé, donc après un échec le chargement s'arrête pour de
			// bon. Un message qui s'évapore laissait croire le catalogue fini.
			expect(button).toHaveTextContent("Je n'ai pas réussi");
			expect(button).toHaveTextContent("Touche pour réessayer");

			await user.click(button);
			expect(onLoad).toHaveBeenCalledTimes(1);
		});

		it("se distingue AUSSI hors couleur — cadre plein et inclinaison inversée", () => {
			renderCard({ error: "Trop de requêtes." });

			const root = slot();
			expect(root).toHaveAttribute("data-state", "error");
			// WCAG 1.4.1 : la couleur ne peut pas être le seul véhicule.
			expect(root.className).toContain("rotate-[1.5deg]");
			const panel = root.querySelector(".border-destructive");
			expect(panel).not.toBeNull();
			expect(panel?.className).toContain("border-solid");
		});

		it("l'emporte sur l'état « fin » quand les deux sont possibles", () => {
			// `hasMore: false` + une erreur : c'est un ÉCHEC, pas une fin. Sans cette
			// priorité, un lot raté sur la dernière page afficherait la signature
			// « c'est tout pour aujourd'hui » alors qu'il reste des pièces.
			renderCard({ hasMore: false, error: "Trop de requêtes." });

			expect(slot()).toHaveAttribute("data-state", "error");
			expect(screen.getByRole("button")).toBeInTheDocument();
		});
	});

	describe("en fin de catalogue", () => {
		it("n'est plus un bouton — pas de cible clavier qui ne fait rien", () => {
			renderCard({ hasMore: false, remainingCount: 0, loadCount: 3 });

			expect(screen.queryByRole("button")).toBeNull();
			expect(slot()).toHaveAttribute("data-state", "done");
		});

		it("dit le mot de la fin au lieu de laisser la page s'arrêter sur du blanc", () => {
			renderCard({ hasMore: false, remainingCount: 0, loadCount: 3 });

			const root = slot();
			expect(root).toHaveTextContent("Voilà");
			expect(root).toHaveTextContent("c'est tout ce que j'ai sorti pour aujourd'hui");
			// Plus de paraphe « — Léane » en cursive : ce carton est la DERNIÈRE
			// cellule de la grille, donc à ~200 px du pied de page, qui signe déjà.
			// Le mot reste, au registre des trois autres états (display + note).
			expect(root).not.toHaveTextContent("— Léane");
			expect(root.querySelector(".font-cursive")).toBeNull();
			expect(root.querySelector(".font-display")).not.toBeNull();
		});
	});

	describe("le liseré des lots", () => {
		const litCount = () =>
			Array.from(slot().querySelectorAll("[aria-hidden='true'] > span")).filter(
				(segment) => !segment.className.includes("bg-muted"),
			).length;

		it("allume un segment par lot, et recommence au 5ᵉ", () => {
			renderCard({ loadCount: 0 });
			expect(litCount()).toBe(0);
			cleanup();

			renderCard({ loadCount: 1 });
			expect(litCount()).toBe(1);
			cleanup();

			renderCard({ loadCount: 4 });
			expect(litCount()).toBe(4);
			cleanup();

			// Un cycle, pas une jauge : le client ne connaît pas la longueur totale
			// du déroulé, une barre qui n'arrive jamais au bout serait un mensonge.
			renderCard({ loadCount: 5 });
			expect(litCount()).toBe(1);
		});

		it("est complet en fin de catalogue", () => {
			renderCard({ hasMore: false, remainingCount: 0, loadCount: 2 });
			expect(litCount()).toBe(4);
		});

		it("reste décoratif — il ne porte aucune information", () => {
			renderCard({ loadCount: 2 });
			const rail = slot().querySelector("[aria-hidden='true']");
			expect(rail).not.toBeNull();
			expect(rail).toHaveAttribute("aria-hidden", "true");
		});
	});
});
