import { useEffect, useRef, useState } from "react";

import { FOCUSABLE_SELECTOR } from "./constants";

interface UseKeyboardNavigationOptions {
	/**
	 * Mode recherche (≥ `MIN_SEARCH_LENGTH` caractères saisis).
	 *
	 * Détermine **le mécanisme de roving**, pas seulement l'habillage ARIA :
	 * - `true` → combobox ARIA 1.2 : l'input garde le focus, l'option courante est
	 *   désignée par `aria-activedescendant` + `aria-selected`.
	 * - `false` → panneau de navigation ordinaire : les flèches déplacent le
	 *   **focus DOM réel**, que les lecteurs d'écran annoncent nativement.
	 */
	isSearchMode: boolean;
	/** Rend le focus au champ de recherche (retour à la frappe depuis la liste). */
	focusSearchInput?: () => void;
}

/**
 * Navigation clavier de la recherche rapide, en deux modes.
 *
 * Le mode idle n'utilise PAS `aria-activedescendant` : son conteneur n'est pas un
 * `listbox` (choix F3 du 2026-05-29), or `aria-activedescendant` n'a de sens que
 * dans un widget composite. Auparavant les items idle portaient `role="option"`
 * sans listbox propriétaire et le roving n'était annoncé nulle part. Déplacer le
 * focus réel est le pattern natif : zéro ARIA, annonce garantie, et `Enter`
 * redevient l'activation native du lien/bouton.
 */
/**
 * Déplacement commun aux deux modes ; renvoie l'index retenu, ou `null`.
 *
 * ← et → sont des synonymes de ↑ et ↓ : le nuancier est une GRILLE
 * (`grid-cols-4 sm:grid-cols-6`), et l'APG attend qu'on puisse s'y déplacer
 * horizontalement. Sans eux, les deux touches ne faisaient rien du tout sur le
 * mur. Le déplacement reste linéaire — passer à un vrai parcours 2-D
 * demanderait de dériver les lignes de la géométrie rendue, que jsdom ne
 * connaît pas.
 *
 * ⚠️ Ces deux touches ne sont acceptées QUE lorsque le focus a déjà quitté le
 * champ (cf. `allowHorizontal`) : dans le champ, ← et → appartiennent au curseur
 * de saisie.
 */
const computeNextIndex = (key: string, count: number, current: number): number | null => {
	switch (key) {
		case "ArrowDown":
		case "ArrowRight":
			return current < count - 1 ? current + 1 : 0;
		case "ArrowUp":
		case "ArrowLeft":
			return current > 0 ? current - 1 : count - 1;
		case "Home":
			return 0;
		case "End":
			return count - 1;
		default:
			return null;
	}
};

/** Touches de déplacement horizontal — réservées au focus hors du champ. */
const HORIZONTAL_KEYS = new Set(["ArrowLeft", "ArrowRight"]);

export function useKeyboardNavigation({
	isSearchMode,
	focusSearchInput,
}: UseKeyboardNavigationOptions) {
	const [activeIndex, setActiveIndex] = useState(-1);
	// Nœud conteneur en ÉTAT (callback ref), pas en `useRef` : le conteneur vit
	// dans `DialogContent`, que Radix démonte à chaque fermeture (Portal), alors
	// que ce hook reste monté à vie après la première ouverture (lazy gate). Un
	// effet `[]` lisant `contentRef.current` ne voyait que le nœud de la 1ʳᵉ
	// ouverture : à la réouverture, observer et focusables pointaient des
	// éléments détachés — navigation clavier morte dès la 2ᵉ ouverture.
	// Verrouillé par `keyboard-navigation-reopen.regression.test.tsx`.
	const [containerNode, setContainerNode] = useState<HTMLDivElement | null>(null);
	const focusablesRef = useRef<HTMLElement[]>([]);

	// Cache focusable elements and refresh when DOM content changes.
	// Re-runs on every (re)attach of the results container.
	useEffect(() => {
		const container = containerNode;
		if (!container) {
			focusablesRef.current = [];
			return;
		}

		const refresh = () => {
			const elements = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
			focusablesRef.current = elements;
			for (let i = 0; i < elements.length; i++) {
				const el = elements[i];
				if (!el) continue;
				el.dataset.qsNavId = String(i);
				// ⚠️ Réécriture INCONDITIONNELLE. C'était `if (!el.id)`, et l'`id`
				// devenait donc collant alors qu'`activeDescendantId` est dérivé de
				// l'INDEX (`qs-nav-${activeIndex}`). React réutilise les nœuds des
				// enfants keyés (`products` keyé par `product.id`, `Stagger` préserve la
				// clé) : dès qu'une frappe change le CLASSEMENT en gardant un produit,
				// le nœud réutilisé conservait l'`id` de son ancienne position pendant
				// qu'un nœud neuf prenait le même — deux `id` identiques, et un
				// `aria-activedescendant` qui pointait soit le mauvais résultat, soit
				// rien du tout. Le surlignage visuel (`data-active`, piloté par
				// `dataset.qsNavId`) restait juste : le défaut n'existait QUE pour les
				// lecteurs d'écran. Aucun de ces éléments ne porte d'`id` d'auteur, la
				// garde ne protégeait donc rien. Audit UI/UX 2026-08-05 (P1-1).
				el.id = `qs-nav-${i}`;
			}
		};

		refresh();
		const observer = new MutationObserver(refresh);
		observer.observe(container, { childList: true, subtree: true });
		return () => observer.disconnect();
	}, [containerNode]);

	// Sync `data-active` (visuel) ET `aria-selected` (ARIA) sur l'option courante.
	//
	// `aria-selected` était figé à `false` sur les 7 sites d'option : l'état actif
	// n'était porté que par un attribut `data-*`, invisible de l'arbre
	// d'accessibilité. L'écrire ici plutôt que de faire descendre une prop
	// `isActive` dans chaque composant tient en quelques lignes et couvre tous les
	// sites d'un coup — la liste des options est déjà maintenue par ce hook.
	useEffect(() => {
		const container = containerNode;
		if (!container) return;

		const prev = container.querySelector('[data-active="true"]');
		if (prev) {
			prev.removeAttribute("data-active");
			if (prev.getAttribute("role") === "option") {
				prev.setAttribute("aria-selected", "false");
			}
		}
		const el = focusablesRef.current[activeIndex];
		if (el) {
			el.setAttribute("data-active", "true");
			if (el.getAttribute("role") === "option") {
				el.setAttribute("aria-selected", "true");
			}
		}
	}, [activeIndex, containerNode]);

	// Survol : uniquement en mode recherche. En idle le roving pilote le focus
	// réel — laisser la souris le voler ferait sauter le focus sous le curseur.
	useEffect(() => {
		const container = containerNode;
		if (!container || !isSearchMode) return;

		const handleMouseOver = (e: MouseEvent) => {
			const target = (e.target as HTMLElement).closest<HTMLElement>(FOCUSABLE_SELECTOR);
			if (!target || !container.contains(target)) return;

			const id = target.dataset.qsNavId;
			if (id != null) {
				setActiveIndex(Number(id));
			}
		};

		container.addEventListener("mouseover", handleMouseOver);
		return () => container.removeEventListener("mouseover", handleMouseOver);
	}, [isSearchMode, containerNode]);

	// Bound to the search <input> onKeyDown: the input keeps focus (ARIA 1.2
	// combobox / aria-activedescendant pattern), so the handler must live on the
	// element that actually receives the keydown — not on the listbox container.
	const handleArrowNavigation = (e: React.KeyboardEvent<HTMLElement>, allowHorizontal = false) => {
		const focusables = focusablesRef.current;
		if (focusables.length === 0) return;

		// ← et → n'appartiennent au roving que si le focus a QUITTÉ le champ. Bound
		// à l'`onKeyDown` de l'input, ce handler les recevrait sinon en pleine
		// saisie — et déplacerait le focus au lieu du curseur de texte. Seul
		// `handleContentKeyDown` (conteneur, mode idle, focus déjà sur un item) les
		// autorise. React n'appelle un `onKeyDown` qu'avec l'événement : le défaut
		// `false` est donc bien celui du câblage sur l'input.
		if (!allowHorizontal && HORIZONTAL_KEYS.has(e.key)) return;

		// Mode recherche : Enter active l'option courante (le focus reste au champ).
		// En idle, on ne l'intercepte pas : le focus est déjà SUR l'élément, donc
		// Enter l'active nativement (lien ou bouton).
		if (e.key === "Enter") {
			if (isSearchMode && activeIndex >= 0 && focusables[activeIndex]) {
				e.preventDefault();
				focusables[activeIndex].click();
			}
			return;
		}

		// En idle, la position courante est celle du FOCUS, pas de `activeIndex` :
		// ce dernier n'est jamais avancé dans ce mode (il pilote l'ARIA du combobox,
		// absent ici). Le lire ferait retomber chaque flèche sur l'index 0. Dériver
		// du focus est aussi plus robuste : si l'utilisateur clique ou tabule
		// ailleurs, la reprise se fait au bon endroit.
		const current = isSearchMode
			? activeIndex
			: focusables.findIndex((el) => el === document.activeElement);

		const nextIndex = computeNextIndex(e.key, focusables.length, current);
		if (nextIndex === null) return;
		e.preventDefault();

		// Pas d'haptique : c'est un déplacement au CLAVIER. Le retour tactile est
		// réservé au doigt ; en plus, le key-repeat d'une flèche maintenue produisait
		// une cascade que seul le cooldown de 80 ms amortissait.
		const target = focusables[nextIndex];
		if (isSearchMode) {
			setActiveIndex(nextIndex);
		} else {
			// Focus réel : annoncé nativement, et le prochain Enter active l'élément.
			target?.focus();
		}
		target?.scrollIntoView({ block: "nearest" });
	};

	/**
	 * Posé sur le conteneur de résultats, pour le mode idle uniquement : une fois
	 * le focus déplacé sur un item, les keydown n'atteignent plus l'input.
	 */
	const handleContentKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
		if (isSearchMode) return;

		// Reprendre la frappe sans avoir à re-cliquer dans le champ. PAS de
		// `preventDefault` : focaliser pendant le keydown redirige le `beforeinput`
		// qui suit vers le champ nouvellement focus, donc le caractère y atterrit.
		if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
			focusSearchInput?.();
			return;
		}

		if (
			e.key === "ArrowDown" ||
			e.key === "ArrowUp" ||
			e.key === "Home" ||
			e.key === "End" ||
			HORIZONTAL_KEYS.has(e.key)
		) {
			handleArrowNavigation(e, true);
		}
	};

	const resetActiveIndex = () => setActiveIndex(-1);

	// Derive activeDescendantId from state only (avoid reading ref during render).
	// En idle il n'y a pas de descendant actif : c'est le focus réel qui porte
	// l'état, et le conteneur n'est pas un listbox.
	const activeDescendantId = isSearchMode && activeIndex >= 0 ? `qs-nav-${activeIndex}` : undefined;

	return {
		// Callback ref : chaque (re)montage du conteneur re-déclenche l'effet
		// d'indexation ci-dessus. `setState` est stable, utilisable tel quel.
		contentRef: setContainerNode,
		handleArrowNavigation,
		handleContentKeyDown,
		resetActiveIndex,
		activeDescendantId,
	};
}
