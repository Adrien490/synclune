/**
 * @regression qs-nav-ids-follow-index
 *
 * `useKeyboardNavigation` posait l'`id` de roving sous une garde `if (!el.id)`,
 * alors qu'`activeDescendantId` le DÉRIVE de l'index (`qs-nav-${activeIndex}`).
 *
 * React réutilise les nœuds DOM des enfants keyés — `products.map` est keyé par
 * `product.id` et `Stagger` préserve la clé de son enfant (`getStableKey`). Dès
 * qu'une frappe changeait le CLASSEMENT en gardant un produit, le nœud réutilisé
 * conservait l'`id` de son ANCIENNE position pendant qu'un nœud neuf prenait le
 * même : deux éléments avec le même `id`, et un `aria-activedescendant` qui
 * pointait soit le mauvais résultat, soit un id inexistant.
 *
 * Le défaut n'existait QUE pour les lecteurs d'écran : `data-active` est piloté
 * par `dataset.qsNavId`, lui toujours réécrit, donc le surlignage visuel restait
 * juste. Audit UI/UX 2026-08-05 (P1-1).
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { createElement, type FC, type ReactNode } from "react";

import { useKeyboardNavigation } from "../use-keyboard-navigation";

// ─── MutationObserver déclenchable à la main ─────────────────────────────────
//
// Le vrai observer réagit au `childList` ; ici on veut contrôler QUAND la passe
// d'indexation rejoue, pour reproduire exactement « rendu 1, puis rendu 2 avec
// un nœud réutilisé ».

const observers: MutationCallback[] = [];

class ManualMutationObserver {
	constructor(callback: MutationCallback) {
		observers.push(callback);
	}
	observe() {}
	disconnect() {}
	takeRecords(): MutationRecord[] {
		return [];
	}
}

vi.stubGlobal("MutationObserver", ManualMutationObserver);

function flushObservers() {
	for (const cb of observers) cb([], null as unknown as MutationObserver);
}

// ─── Harness ─────────────────────────────────────────────────────────────────

const Harness: FC<{ children?: ReactNode }> = ({ children }) => {
	const nav = useKeyboardNavigation({ isSearchMode: true });
	return createElement("div", { ref: nav.contentRef }, children);
};

/** Options keyées, comme les résultats produit le sont par `product.id`. */
function options(keys: string[]) {
	return keys.map((k) =>
		createElement("a", { key: k, href: "#", role: "option", "data-qs-option": "", "data-k": k }, k),
	);
}

afterEach(() => {
	observers.length = 0;
	cleanup();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("ids de roving — suivent l'index, même quand React réutilise un nœud", () => {
	it("réindexe un nœud réutilisé qui a changé de position", () => {
		// 1ʳᵉ requête : un seul résultat, « p1 ».
		const { container, rerender } = render(createElement(Harness, null, options(["p1"])));
		flushObservers();

		expect(container.querySelector('[data-k="p1"]')!.id).toBe("qs-nav-0");

		// 2ᵉ requête : « p1 » survit mais recule d'un rang ; « p5 » et « p7 » sont neufs.
		// React réutilise le nœud de p1 (même clé) — c'est là que l'`id` restait collé.
		rerender(createElement(Harness, null, options(["p5", "p1", "p7"])));
		flushObservers();

		expect(container.querySelector('[data-k="p5"]')!.id).toBe("qs-nav-0");
		expect(container.querySelector('[data-k="p1"]')!.id).toBe("qs-nav-1");
		expect(container.querySelector('[data-k="p7"]')!.id).toBe("qs-nav-2");
	});

	it("ne laisse jamais deux options porter le même id", () => {
		const { container, rerender } = render(createElement(Harness, null, options(["p1", "p2"])));
		flushObservers();

		rerender(createElement(Harness, null, options(["p9", "p2", "p1"])));
		flushObservers();

		const ids = Array.from(container.querySelectorAll<HTMLElement>("[data-qs-option]")).map(
			(el) => el.id,
		);

		expect(ids).toHaveLength(3);
		expect(new Set(ids).size).toBe(3);
	});

	it("garde `dataset.qsNavId` et `id` d'accord — c'est leur divergence qui cassait l'annonce", () => {
		const { container, rerender } = render(createElement(Harness, null, options(["p1"])));
		flushObservers();

		rerender(createElement(Harness, null, options(["p5", "p1"])));
		flushObservers();

		for (const el of container.querySelectorAll<HTMLElement>("[data-qs-option]")) {
			expect(el.id).toBe(`qs-nav-${el.dataset.qsNavId}`);
		}
	});
});
