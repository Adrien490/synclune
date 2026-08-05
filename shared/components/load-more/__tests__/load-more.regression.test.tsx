/**
 * @regression load-more-state-and-focus
 *
 * Verrouille la refonte d'état de `LoadMore` (5 `useState` → un `useActionState`
 * keyé sur les lots) et les défauts qu'elle a corrigés :
 *
 * 1. **Annonce périmée** — la phrase lue au lecteur d'écran dérivait de
 *    `additionalItems.length` capturé dans la closure du rendu, pas de l'état
 *    commité : au 2ᵉ chargement le total annoncé retardait d'un lot.
 * 2. **Focus qui remonte** — la cible du focus était figée sur le tout premier
 *    item ajouté (`firstNewIndex` valait toujours `0`), donc au 2ᵉ clic le focus
 *    repartait AU-DESSUS des nouveaux items.
 * 3. **Focus volé au défilement** — le même `.focus()` s'exécutait sur un
 *    chargement déclenché par l'IntersectionObserver, en plein scroll.
 * 4. **Focus perdu en cas d'ÉCHEC** (2026-08-05) — l'effet était gardé sur
 *    `loadCount`, qui ne bouge pas quand le lot échoue : le focus, parti de
 *    l'affordance pendant l'attente, n'était rendu à personne et l'utilisateur
 *    au clavier repartait du premier lien de la page.
 *
 * Plus les invariants de rendu : `--item-index` redémarre à 0 à chaque lot
 * (sinon `animation-delay` change sur des nœuds déjà animés), un `result.error`
 * n'avance pas le curseur, et l'erreur vit dans l'ÉTAT — plus dans un toast qui
 * s'évapore alors que l'auto-load, lui, s'est arrêté définitivement.
 *
 * ⚠️ Ce composant ne rend plus AUCUN conteneur ni AUCUNE copie : ses cellules et
 * son affordance sont des enfants directs de la grille appelante, et
 * l'apparence de l'affordance appartient à cette grille (`renderAffordance`).
 * Le harnais ci-dessous fournit donc sa propre affordance minimale — les
 * libellés qu'il emploie lui appartiennent, ils ne décrivent pas la boutique.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockInView } = vi.hoisted(() => ({
	mockInView: { value: false, listeners: new Set<() => void>() },
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

/*
 * jsdom n'implémente pas IntersectionObserver : le vrai `useInView`
 * court-circuiterait et resterait à `false`. On le remplace par un store
 * souscriptible plutôt que par un `() => true` constant, pour reproduire
 * FIDÈLEMENT sa séquence : `false` au premier rendu (le hook est SSR-safe, il
 * s'initialise à `useState(false)` et ne passe à `true` que depuis le callback de
 * l'observer), puis `true` APRÈS le montage.
 *
 * ⚠️ Ce n'est pas un détail de confort. Un mock qui renvoie `true` dès le premier
 * rendu ferait dispatcher l'action depuis l'effet de MONTAGE — et dans ce cas
 * l'état de `useActionState` ne se commite pas (l'action s'exécute, sa valeur de
 * retour est perdue). Le composant n'atteint jamais ce chemin en production,
 * mais un tel mock ferait échouer le test pour une raison qui n'a rien à voir
 * avec le code sous test.
 */
vi.mock("@/shared/hooks/use-in-view", async () => {
	const { useSyncExternalStore } = await import("react");
	return {
		useInView: () =>
			useSyncExternalStore(
				(onChange: () => void) => {
					mockInView.listeners.add(onChange);
					return () => mockInView.listeners.delete(onChange);
				},
				() => mockInView.value,
				() => false,
			),
	};
});

// ============================================================================
// IMPORT UNDER TEST
// ============================================================================

import { LoadMore } from "../load-more";

// ============================================================================
// HELPERS
// ============================================================================

interface Item {
	id: string;
	label: string;
}

/** Un lot de `size` items, préfixés pour rester distinguables entre lots. */
function batch(prefix: string, size: number): Item[] {
	return Array.from({ length: size }, (_, i) => ({
		id: `${prefix}-${i}`,
		label: `${prefix} ${i}`,
	}));
}

interface SetupOptions {
	/** Réponses successives de `loadFn`, dans l'ordre. */
	responses: Array<{
		items: Item[];
		nextCursor: string | null;
		hasMore: boolean;
		error?: string;
	}>;
	initialDisplayedCount?: number;
	totalCount?: number;
	enableAutoLoad?: boolean;
	itemsGender?: "m" | "f";
	itemsLabel?: string;
	itemsLabelPlural?: string;
}

/** Le libellé de l'affordance appartient AU HARNAIS, pas à la boutique. */
const AFFORDANCE_LABEL = "Charger la suite";

function setup({
	responses,
	initialDisplayedCount = 20,
	totalCount = 60,
	enableAutoLoad = false,
	itemsGender,
	itemsLabel = "produit",
	itemsLabelPlural = "produits",
}: SetupOptions) {
	const seenCursors: string[] = [];
	let call = 0;

	const loadFn = vi.fn(async (cursor: string) => {
		seenCursors.push(cursor);
		// La dernière réponse est rejouée si on dépasse (cas « réessayer »).
		return responses[Math.min(call++, responses.length - 1)]!;
	});

	const utils = render(
		<LoadMore<Item>
			initialCursor="cursor-0"
			initialHasMore
			initialDisplayedCount={initialDisplayedCount}
			totalCount={totalCount}
			loadFn={loadFn}
			getItemKey={(item) => item.id}
			renderItem={(item) => <span data-testid="item">{item.label}</span>}
			itemsLabel={itemsLabel}
			itemsLabelPlural={itemsLabelPlural}
			itemsGender={itemsGender}
			itemClassName="product-item"
			enableAutoLoad={enableAutoLoad}
			renderAffordance={(state, handlers) => (
				<button
					type="button"
					ref={handlers.ref}
					onClick={handlers.onLoad}
					aria-disabled={state.isPending}
					data-testid="affordance"
					data-remaining={state.remainingCount}
					data-loadcount={state.loadCount}
				>
					{state.error ?? AFFORDANCE_LABEL}
				</button>
			)}
		/>,
	);

	return { ...utils, loadFn, seenCursors };
}

function status(): string {
	return screen.getByRole("status").textContent;
}

/** Les cellules ajoutées, dans l'ordre du DOM. */
function cells(): HTMLElement[] {
	return screen.getAllByTestId("item").map((node) => node.parentElement as HTMLElement);
}

function affordance(): HTMLElement {
	return screen.getByTestId("affordance");
}

/** L'affordance entre (ou sort) du viewport — l'observer notifie APRÈS le montage. */
async function setViewport(visible: boolean): Promise<void> {
	await act(async () => {
		mockInView.value = visible;
		mockInView.listeners.forEach((notify) => notify());
	});
	// Laisse l'action `auto` se résoudre et React commiter.
	await act(async () => {
		await new Promise((resolve) => setTimeout(resolve, 0));
	});
}

const enterViewport = () => setViewport(true);
const leaveViewport = () => setViewport(false);

// ============================================================================
// TESTS
// ============================================================================

describe("LoadMore", () => {
	beforeEach(() => {
		mockInView.value = false;
	});

	afterEach(cleanup);

	it("cumule le total annoncé sur deux chargements successifs", async () => {
		const user = userEvent.setup();
		setup({
			responses: [
				{ items: batch("a", 20), nextCursor: "cursor-1", hasMore: true },
				{ items: batch("b", 20), nextCursor: "cursor-2", hasMore: true },
			],
			initialDisplayedCount: 20,
			totalCount: 60,
		});

		// La live region est présente et VIDE au premier rendu — une région qui
		// apparaît déjà remplie n'est pas annoncée.
		expect(status()).toBe("");

		await user.click(affordance());
		await waitFor(() => expect(status()).toContain("40 sur 60"));

		await user.click(affordance());
		// Le défaut historique annonçait « 40 sur 60 » une seconde fois : la closure
		// lisait la longueur d'AVANT le premier lot.
		await waitFor(() => expect(status()).toContain("60 sur 60"));
	});

	it("accorde « nouveau » / « nouveaux » (jamais « nouvel »)", async () => {
		const user = userEvent.setup();
		setup({
			responses: [
				{ items: batch("a", 1), nextCursor: "cursor-1", hasMore: true },
				{ items: batch("b", 3), nextCursor: null, hasMore: false },
			],
		});

		await user.click(affordance());
		await waitFor(() => expect(status()).toContain("1 nouveau produit chargé."));
		expect(status()).not.toContain("nouvel");

		await user.click(affordance());
		await waitFor(() => expect(status()).toContain("3 nouveaux produits chargés."));
	});

	it("accorde au FÉMININ quand le libellé l'est — « 1 nouvelle pièce chargée »", async () => {
		const user = userEvent.setup();
		setup({
			responses: [
				{ items: batch("a", 1), nextCursor: "cursor-1", hasMore: true },
				{ items: batch("b", 3), nextCursor: null, hasMore: false },
			],
			itemsGender: "f",
			itemsLabel: "pièce",
			itemsLabelPlural: "pièces",
			initialDisplayedCount: 20,
			totalCount: 60,
		});

		// Le catalogue dit « pièce ». Sans `itemsGender`, le gabarit masculin
		// produisait « 1 nouveau pièce chargé » — une faute invisible en revue
		// visuelle, puisque la phrase est `sr-only`.
		await user.click(affordance());
		await waitFor(() => expect(status()).toContain("1 nouvelle pièce chargée."));
		expect(status()).toContain("21 sur 60 pièces affichées.");

		await user.click(affordance());
		await waitFor(() => expect(status()).toContain("3 nouvelles pièces chargées."));
	});

	it("donne le focus au premier item du NOUVEAU lot, pas du premier lot", async () => {
		const user = userEvent.setup();
		setup({
			responses: [
				{ items: batch("a", 3), nextCursor: "cursor-1", hasMore: true },
				{ items: batch("b", 3), nextCursor: "cursor-2", hasMore: true },
			],
		});

		await user.click(affordance());
		await waitFor(() => expect(cells()).toHaveLength(3));
		expect(document.activeElement).toBe(cells()[0]);

		await user.click(affordance());
		await waitFor(() => expect(cells()).toHaveLength(6));
		// Défaut historique : le focus revenait sur `cells()[0]` (« a 0 »).
		expect(document.activeElement).toBe(cells()[3]);
		expect(document.activeElement?.textContent).toBe("b 0");
	});

	it("ne déplace PAS le focus sur un chargement déclenché par l'observer", async () => {
		setup({
			responses: [{ items: batch("a", 3), nextCursor: "cursor-1", hasMore: true }],
			enableAutoLoad: true,
		});

		expect(screen.queryAllByTestId("item")).toHaveLength(0);

		await enterViewport();

		expect(cells()).toHaveLength(3);
		// Rien n'a pris le focus : il reste sur le body.
		expect(document.activeElement).toBe(document.body);
		// L'annonce, elle, a bien eu lieu.
		expect(status()).toContain("3 nouveaux produits chargés.");
	});

	it("rend le focus à l'affordance quand le chargement DEMANDÉ échoue", async () => {
		const user = userEvent.setup();
		setup({
			responses: [{ items: [], nextCursor: null, hasMore: false, error: "Trop de requêtes." }],
		});

		await user.click(affordance());

		// Défaut historique : l'effet de focus était gardé sur `loadCount`, qui ne
		// bouge pas en cas d'échec. Le focus, parti du bouton pendant l'attente,
		// n'était rendu à personne — Tab repartait du haut du document.
		await waitFor(() => expect(document.activeElement).toBe(affordance()));
		expect(affordance()).toHaveTextContent("Trop de requêtes.");
	});

	it("auto-charge le curseur SUIVANT quand l'affordance revient dans le viewport", async () => {
		const { loadFn, seenCursors } = setup({
			responses: [
				{ items: batch("a", 3), nextCursor: "cursor-1", hasMore: true },
				{ items: batch("b", 2), nextCursor: "cursor-2", hasMore: true },
			],
			enableAutoLoad: true,
		});

		await enterViewport();
		await leaveViewport();
		await enterViewport();

		expect(loadFn).toHaveBeenCalledTimes(2);
		// La garde par curseur laisse passer un curseur NEUF — elle n'interdit que
		// de rejouer celui qui a déjà été consommé.
		expect(seenCursors).toEqual(["cursor-0", "cursor-1"]);
		expect(screen.getAllByTestId("item")).toHaveLength(5);
	});

	it("arrête l'auto-load après un échec, sans condamner l'affordance", async () => {
		const user = userEvent.setup();
		const { loadFn, seenCursors } = setup({
			responses: [
				{ items: [], nextCursor: null, hasMore: false, error: "Trop de requêtes." },
				{ items: batch("a", 2), nextCursor: null, hasMore: false },
			],
			enableAutoLoad: true,
		});

		await enterViewport();
		expect(loadFn).toHaveBeenCalledTimes(1);

		// L'erreur vit dans l'ÉTAT et reste à l'écran : c'est ce qui remplace le
		// toast, qui s'évaporait alors que l'auto-load, lui, s'était arrêté
		// définitivement — le catalogue paraissait simplement fini.
		expect(affordance()).toHaveTextContent("Trop de requêtes.");

		// Le curseur n'a pas avancé : re-rentrer dans le viewport ne doit PAS
		// relancer une boucle de retry tant que l'affordance est à l'écran.
		await leaveViewport();
		await enterViewport();
		expect(loadFn).toHaveBeenCalledTimes(1);

		// L'affordance, elle, ne consulte pas cette garde : elle reste opérante.
		await user.click(affordance());
		await waitFor(() => expect(screen.getAllByTestId("item")).toHaveLength(2));
		expect(seenCursors).toEqual(["cursor-0", "cursor-0"]);
		// Et le message disparaît dès que le rattrapage réussit.
		expect(affordance()).toHaveTextContent(AFFORDANCE_LABEL);
	});

	it("redémarre --item-index à 0 à chaque lot", async () => {
		const user = userEvent.setup();
		setup({
			responses: [
				{ items: batch("a", 3), nextCursor: "cursor-1", hasMore: true },
				{ items: batch("b", 3), nextCursor: "cursor-2", hasMore: true },
			],
		});

		await user.click(affordance());
		await waitFor(() => expect(cells()).toHaveLength(3));
		await user.click(affordance());
		await waitFor(() => expect(cells()).toHaveLength(6));

		const indexes = cells().map((cell) => cell.style.getPropertyValue("--item-index"));
		// Un index global (0..5) ferait varier `animation-delay` sur les nœuds du
		// lot 1, dont l'animation est déjà terminée.
		expect(indexes).toEqual(["0", "1", "2", "0", "1", "2"]);
		expect(cells().every((cell) => cell.classList.contains("product-item"))).toBe(true);
	});

	it("n'avance pas le curseur quand loadFn renvoie une erreur", async () => {
		const user = userEvent.setup();
		const { loadFn, seenCursors } = setup({
			responses: [
				{ items: [], nextCursor: null, hasMore: false, error: "Trop de requêtes." },
				{ items: batch("a", 2), nextCursor: null, hasMore: false },
			],
		});

		await user.click(affordance());
		await waitFor(() => expect(affordance()).toHaveTextContent("Trop de requêtes."));

		// Ni items ajoutés, ni annonce, ni `hasMore` retombé à false.
		expect(screen.queryAllByTestId("item")).toHaveLength(0);
		expect(status()).toBe("");

		// L'affordance reste opérante et rejoue le MÊME curseur.
		await user.click(affordance());
		await waitFor(() => expect(screen.getAllByTestId("item")).toHaveLength(2));
		expect(loadFn).toHaveBeenCalledTimes(2);
		expect(seenCursors).toEqual(["cursor-0", "cursor-0"]);
	});

	it("dérive `remainingCount` de l'état commité, jamais d'un compteur parallèle", async () => {
		const user = userEvent.setup();
		setup({
			responses: [{ items: batch("a", 20), nextCursor: "cursor-1", hasMore: true }],
			initialDisplayedCount: 20,
			totalCount: 60,
		});

		expect(affordance()).toHaveAttribute("data-remaining", "40");
		expect(affordance()).toHaveAttribute("data-loadcount", "0");

		await user.click(affordance());
		await waitFor(() => expect(affordance()).toHaveAttribute("data-remaining", "20"));
		expect(affordance()).toHaveAttribute("data-loadcount", "1");
	});

	it("garde l'affordance après le DERNIER lot — c'est là qu'elle dit « c'est tout »", async () => {
		const user = userEvent.setup();
		setup({
			responses: [{ items: batch("a", 2), nextCursor: null, hasMore: false }],
			initialDisplayedCount: 20,
			totalCount: 22,
		});

		await user.click(affordance());
		await waitFor(() => expect(screen.getAllByTestId("item")).toHaveLength(2));

		// `hasMore` est retombé à false, mais des lots ont été chargés : sans cette
		// branche la page s'arrêtait sur du blanc, sans dire si elle était finie
		// ou cassée.
		expect(affordance()).toBeInTheDocument();
		expect(affordance()).toHaveAttribute("data-remaining", "0");
	});

	it("ne rend rien quand il n'y a ni page suivante ni item ajouté", () => {
		const { container } = render(
			<LoadMore<Item>
				initialCursor={null}
				initialHasMore={false}
				initialDisplayedCount={5}
				totalCount={5}
				loadFn={vi.fn()}
				getItemKey={(item) => item.id}
				renderItem={(item) => <span>{item.label}</span>}
				itemsLabel="produit"
				itemsLabelPlural="produits"
				renderAffordance={() => <button type="button">jamais rendu</button>}
			/>,
		);

		expect(container).toBeEmptyDOMElement();
	});
});
