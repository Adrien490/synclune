/**
 * @regression load-more-state-and-focus
 *
 * Verrouille la refonte d'état de `LoadMore` (5 `useState` → un `useActionState`
 * keyé sur les lots) et les trois défauts qu'elle a corrigés :
 *
 * 1. **Annonce périmée** — la phrase lue au lecteur d'écran dérivait de
 *    `additionalItems.length` capturé dans la closure du rendu, pas de l'état
 *    commité : au 2ᵉ chargement le total annoncé retardait d'un lot.
 * 2. **Focus qui remonte** — la cible du focus était figée sur le tout premier
 *    item ajouté (`firstNewIndex` valait toujours `0`), donc au 2ᵉ clic le focus
 *    repartait AU-DESSUS des nouveaux items.
 * 3. **Focus volé au défilement** — le même `.focus()` s'exécutait sur un
 *    chargement déclenché par l'IntersectionObserver, en plein scroll.
 *
 * Plus deux invariants de rendu : `--item-index` redémarre à 0 à chaque lot (sinon
 * `animation-delay` change sur des nœuds déjà animés), et un `result.error`
 * n'avance pas le curseur.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockToastError, mockInView } = vi.hoisted(() => ({
	mockToastError: vi.fn(),
	mockInView: { value: false, listeners: new Set<() => void>() },
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/utils/toast", () => ({
	toast: { error: mockToastError, success: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

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

vi.mock("@/shared/components/ui/spinner", () => ({
	Spinner: () => null,
}));

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
}

function setup({
	responses,
	initialDisplayedCount = 20,
	totalCount = 60,
	enableAutoLoad = false,
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
			itemsLabel="produit"
			itemsLabelPlural="produits"
			itemsContainerClassName="grid"
			itemClassName="product-item"
			buttonLabel="Voir plus de produits"
			enableAutoLoad={enableAutoLoad}
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

/** Le bouton entre (ou sort) du viewport — l'observer notifie APRÈS le montage. */
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
		mockToastError.mockClear();
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

		await user.click(screen.getByRole("button", { name: /voir plus/i }));
		await waitFor(() => expect(status()).toContain("40 sur 60"));

		await user.click(screen.getByRole("button", { name: /voir plus/i }));
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

		await user.click(screen.getByRole("button", { name: /voir plus/i }));
		await waitFor(() => expect(status()).toContain("1 nouveau produit chargé."));
		expect(status()).not.toContain("nouvel");

		await user.click(screen.getByRole("button", { name: /voir plus/i }));
		await waitFor(() => expect(status()).toContain("3 nouveaux produits chargés."));
	});

	it("donne le focus au premier item du NOUVEAU lot, pas du premier lot", async () => {
		const user = userEvent.setup();
		setup({
			responses: [
				{ items: batch("a", 3), nextCursor: "cursor-1", hasMore: true },
				{ items: batch("b", 3), nextCursor: "cursor-2", hasMore: true },
			],
		});

		await user.click(screen.getByRole("button", { name: /voir plus/i }));
		await waitFor(() => expect(cells()).toHaveLength(3));
		expect(document.activeElement).toBe(cells()[0]);

		await user.click(screen.getByRole("button", { name: /voir plus/i }));
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

	it("auto-charge le curseur SUIVANT quand le bouton revient dans le viewport", async () => {
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

	it("arrête l'auto-load après un échec, sans condamner le bouton", async () => {
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
		expect(mockToastError).toHaveBeenCalledWith("Trop de requêtes.");

		// Le curseur n'a pas avancé : re-rentrer dans le viewport ne doit PAS
		// relancer une boucle de retry tant que le bouton est à l'écran.
		await leaveViewport();
		await enterViewport();
		expect(loadFn).toHaveBeenCalledTimes(1);

		// Le bouton, lui, ne consulte pas cette garde : il reste opérant.
		await user.click(screen.getByRole("button", { name: /voir plus/i }));
		await waitFor(() => expect(screen.getAllByTestId("item")).toHaveLength(2));
		expect(seenCursors).toEqual(["cursor-0", "cursor-0"]);
	});

	it("redémarre --item-index à 0 à chaque lot", async () => {
		const user = userEvent.setup();
		setup({
			responses: [
				{ items: batch("a", 3), nextCursor: "cursor-1", hasMore: true },
				{ items: batch("b", 3), nextCursor: "cursor-2", hasMore: true },
			],
		});

		await user.click(screen.getByRole("button", { name: /voir plus/i }));
		await waitFor(() => expect(cells()).toHaveLength(3));
		await user.click(screen.getByRole("button", { name: /voir plus/i }));
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

		await user.click(screen.getByRole("button", { name: /voir plus/i }));
		await waitFor(() => expect(mockToastError).toHaveBeenCalledWith("Trop de requêtes."));

		// Ni items ajoutés, ni annonce, ni `hasMore` retombé à false.
		expect(screen.queryAllByTestId("item")).toHaveLength(0);
		expect(status()).toBe("");

		// Le bouton reste opérant et rejoue le MÊME curseur.
		await user.click(screen.getByRole("button", { name: /voir plus/i }));
		await waitFor(() => expect(screen.getAllByTestId("item")).toHaveLength(2));
		expect(loadFn).toHaveBeenCalledTimes(2);
		expect(seenCursors).toEqual(["cursor-0", "cursor-0"]);
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
				itemsContainerClassName="grid"
			/>,
		);

		expect(container).toBeEmptyDOMElement();
	});
});
