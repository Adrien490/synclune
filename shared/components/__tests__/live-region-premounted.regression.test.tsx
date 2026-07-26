/**
 * @regression live-region-premounted
 *
 * Une région `aria-live` n'est vocalisée que si elle **existait déjà** dans
 * l'arbre d'accessibilité quand son contenu change. Une région rendue
 * conditionnellement sur la donnée qu'elle annonce entre dans l'arbre au même
 * frame que son texte : les lecteurs d'écran restent muets.
 *
 * L'audit « Système de feedback » a trouvé six régions dans ce cas, dont deux sur
 * des transitions critiques : le **premier** ajout au panier (`CountBadge`, gatée
 * sur `count > 0`) et le passage de la wishlist à l'état vide.
 *
 * Ces tests verrouillent l'invariant : « le nœud `aria-live` est présent au
 * premier rendu, avant que son message n'existe ». Chaque assertion a été prouvée
 * en réintroduisant le rendu conditionnel d'origine — sans quoi un test qui
 * vérifie seulement le cas « message présent » passe aussi bien avec le bug.
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("motion/react", () => ({
	AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	m: { span: (props: React.ComponentProps<"span">) => <span {...props} /> },
	useReducedMotion: () => true,
}));

import { CountBadge } from "@/shared/components/ui/count-badge";

afterEach(() => {
	cleanup();
});

/** Le nœud sr-only piloté par la donnée, distinct du badge visuel `aria-hidden`. */
function getLiveNode(container: HTMLElement): Element | null {
	return container.querySelector("[aria-live]");
}

describe("CountBadge — région live pré-montée", () => {
	it("rend la région même à count=0 (badge invisible)", () => {
		const { container } = render(
			<CountBadge count={0} singularLabel="article" pluralLabel="articles" />,
		);

		const live = getLiveNode(container);
		expect(live).not.toBeNull();
		expect(live).toHaveAttribute("aria-live", "polite");
		expect(live).toHaveTextContent("");
	});

	it("annonce le PREMIER article sans remonter la région (0 → 1)", () => {
		const { container, rerender } = render(
			<CountBadge count={0} singularLabel="article" pluralLabel="articles" />,
		);

		const before = getLiveNode(container);
		expect(before).not.toBeNull();

		rerender(<CountBadge count={1} singularLabel="article" pluralLabel="articles" />);

		const after = getLiveNode(container);
		// Le MÊME nœud DOM porte le message : c'est ce qui rend l'annonce audible.
		// Avec l'ancien `&& visible`, `before` était null et ce nœud venait d'être
		// inséré avec son texte — donc jamais vocalisé.
		expect(after).toBe(before);
		expect(after).toHaveTextContent("1 article");
	});

	it("garde la région montée quand le compteur retombe à 0", () => {
		const { container, rerender } = render(
			<CountBadge count={2} singularLabel="article" pluralLabel="articles" />,
		);
		const before = getLiveNode(container);

		rerender(<CountBadge count={0} singularLabel="article" pluralLabel="articles" />);

		expect(getLiveNode(container)).toBe(before);
		expect(getLiveNode(container)).toHaveTextContent("");
	});

	it("respecte silentLiveRegion (le parent porte l'annonce combinée)", () => {
		const { container } = render(
			<CountBadge count={3} singularLabel="article" pluralLabel="articles" silentLiveRegion />,
		);

		expect(getLiveNode(container)).toBeNull();
	});

	it("n'expose jamais le badge visuel aux lecteurs d'écran", () => {
		render(<CountBadge count={5} singularLabel="article" pluralLabel="articles" />);

		// Le nombre est rendu deux fois : une fois visuellement (aria-hidden) et une
		// fois dans la région. Seule la région doit être lisible.
		expect(screen.getByText("5")).toHaveAttribute("aria-hidden", "true");
	});
});
