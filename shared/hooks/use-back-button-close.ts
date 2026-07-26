"use client";

import { useEffect, useRef, useEffectEvent } from "react";

interface UseBackButtonCloseOptions {
	/** État d'ouverture du modal */
	isOpen: boolean;
	/** Callback appelé lors de la fermeture */
	onClose: () => void;
	/** Identifiant unique pour éviter les conflits entre modals */
	id?: string;
}

// ─── Coordinateur LIFO partagé ──────────────────────────────────────────────
//
// Plusieurs overlays peuvent coexister : un drawer empilé sur le mode sélection
// admin, un dialog au-dessus d'un sheet, etc. Chacun pousse une entrée
// d'historique à l'ouverture. Sans coordination, le listener `popstate` de
// CHAQUE instance réagit à n'importe quel `popstate` — donc fermer un overlay
// enfant (qui fait `history.back()`) fermait aussi l'overlay parent resté
// ouvert (bug : fermer le drawer « ... » désactivait le mode sélection).
//
// Règles :
//  • Seul l'overlay au SOMMET de la pile réagit à un `popstate`.
//  • Le `popstate` provoqué par une fermeture programmatique (`handleClose` →
//    `history.back()`) est ignoré par le parent encore ouvert, qui sinon se
//    fermerait à tort (bug : fermer le drawer « ... » désactivait le mode
//    sélection admin). Le signal est `isOverlayInitiatedPop()` ci-dessous.
//
// Ce signal remplace un compteur `suppressNextPops` qui restait armé jusqu'au
// prochain `popstate`, quel qu'il soit : si le navigateur n'en émettait aucun
// (entrée déjà consommée), il avalait un vrai retour matériel ultérieur. Le
// signal actuel se désarme tout seul, au premier `popstate` OU à l'expiration
// d'un filet — il ne peut plus rester armé indéfiniment.
interface BackEntry {
	id: string;
}

const openStack: BackEntry[] = [];

function isTopEntry(entry: BackEntry): boolean {
	return openStack.length > 0 && openStack[openStack.length - 1] === entry;
}

function removeEntry(entry: BackEntry): void {
	const index = openStack.lastIndexOf(entry);
	if (index !== -1) openStack.splice(index, 1);
}

// ─── Signal « ce popstate vient d'un overlay, pas de l'utilisateur » ─────────
//
// `use-unsaved-changes` pousse SA propre entrée d'historique et écoute
// `popstate` sans connaître cette pile. Sans signal partagé, fermer un drawer
// sur un formulaire dirty déclenchait le `history.back()` de `handleClose`, que
// la garde interprétait comme un départ de page → `window.confirm`
// « modifications non enregistrées » alors que l'utilisateur n'avait fermé
// qu'un overlay.
//
// Sert aussi de discriminant interne : c'est lui qui dit à un overlay parent que
// le pop qui arrive vient de la fermeture d'un enfant, pas de l'utilisateur.
let overlayInitiatedPops = 0;

/** Filet si le navigateur n'émet aucun `popstate` (entrée déjà consommée). */
const OVERLAY_POP_GRACE_MS = 500;

/**
 * `true` entre un `history.back()` déclenché par la fermeture d'un overlay et
 * le `popstate` qui en résulte. Les autres écouteurs `popstate` de
 * l'application (garde de navigation) doivent l'interroger pour ne pas
 * confondre cette fermeture avec un vrai retour utilisateur.
 *
 * @public consommé par `use-unsaved-changes`
 */
export function isOverlayInitiatedPop(): boolean {
	return overlayInitiatedPops > 0;
}

function markOverlayInitiatedPop(): void {
	overlayInitiatedPops += 1;

	// Conteneur plutôt qu'un `let` : `consume` doit pouvoir annuler le timer que
	// seule l'affectation qui la suit peut créer (référence croisée).
	const grace: { timer?: ReturnType<typeof setTimeout> } = {};

	const consume = () => {
		overlayInitiatedPops = Math.max(0, overlayInitiatedPops - 1);
		window.removeEventListener("popstate", consume);
		clearTimeout(grace.timer);
	};

	// Enregistré APRÈS les écouteurs des autres acteurs : ils lisent donc le
	// drapeau encore armé, et c'est nous qui le désarmons en dernier.
	window.addEventListener("popstate", consume);
	grace.timer = setTimeout(consume, OVERLAY_POP_GRACE_MS);
}

/**
 * Hook pour fermer un modal avec le bouton retour du navigateur (mobile)
 *
 * Utilise history.pushState() pour intercepter le bouton retour et fermer
 * le modal au lieu de naviguer en arrière. Coordonne les overlays imbriqués
 * via une pile LIFO partagée (cf. bloc ci-dessus).
 *
 * @example
 * ```tsx
 * useBackButtonClose({
 *   isOpen: open,
 *   onClose: () => setOpen(false),
 *   id: "my-modal",
 * });
 * ```
 */
export function useBackButtonClose({ isOpen, onClose, id = "modal" }: UseBackButtonCloseOptions) {
	const historyPushedRef = useRef(false);

	// Identité stable de cette instance dans la pile partagée.
	const entryRef = useRef<BackEntry | null>(null);
	// Lazy init null-guardée (pas `??=` : non supporté par le React Compiler).
	// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- `??=` non supporté par le React Compiler
	if (entryRef.current === null) {
		entryRef.current = { id };
	}

	// Longueur de l'historique juste après NOTRE `pushState`. Sert à savoir si
	// quelqu'un a empilé une entrée par-dessus la nôtre depuis (cf. handleClose).
	const historyLengthAtPushRef = useRef(0);

	// Pousser un état dans l'historique à l'ouverture + s'enregistrer dans la pile
	useEffect(() => {
		if (!isOpen) return;
		const entry = entryRef.current!;

		if (!historyPushedRef.current) {
			// L'état existant est recopié : le router App Router range ses propres
			// clés (`__NA`, arbre de segments) dans `history.state`, et les écraser
			// lui faisait tenter une navigation MPA si l'utilisateur revenait en
			// avant sur cette entrée. `{...null}` vaut `{}` — sûr au premier push.
			history.pushState({ ...history.state, [id]: true }, "");
			historyPushedRef.current = true;
			historyLengthAtPushRef.current = history.length;
		}

		// Ré-enregistrement idempotent, distinct du push ci-dessus.
		//
		// En StrictMode (dev), React monte les effets, les démonte, puis les
		// remonte. Le cleanup de démontage retirait l'entrée de la pile tandis que
		// le push, gardé par `historyPushedRef`, ne se rejouait pas : l'overlay
		// restait hors de la pile avec `historyPushedRef` à `true`, donc
		// `isTopEntry` définitivement faux — le retour matériel ne le fermait plus
		// du tout, en dev seulement (les tests ne montent pas en StrictMode).
		if (!openStack.includes(entry)) openStack.push(entry);
	}, [isOpen, id]);

	// Réinitialiser le ref + sortir de la pile quand le modal se ferme (par n'importe quel moyen)
	useEffect(() => {
		if (!isOpen) {
			historyPushedRef.current = false;
			removeEntry(entryRef.current!);
		}
	}, [isOpen]);

	// Sécurité : sortir de la pile au démontage (cas d'un overlay démonté en étant ouvert,
	// ex. la card mobile qui bascule en checkbox et démonte son drawer long-press).
	useEffect(() => {
		const entry = entryRef.current!;
		return () => {
			removeEntry(entry);
		};
	}, []);

	// Effect Event pour accéder aux dernières valeurs sans re-registration du listener
	const onPopState = useEffectEvent(() => {
		if (!isOpen || !historyPushedRef.current) return;
		const entry = entryRef.current!;
		// Overlays imbriqués : seul le sommet de la pile réagit.
		if (!isTopEntry(entry)) return;

		// Pop provoqué par la fermeture programmatique d'un enfant : le parent
		// reste ouvert. Le signal se désarme au premier `popstate`, donc un vrai
		// retour matériel ultérieur nous ferme bien.
		if (isOverlayInitiatedPop()) return;

		historyPushedRef.current = false;
		removeEntry(entry);
		onClose();
	});

	// Écouter le bouton retour (popstate) pour fermer le modal
	// Only attach the listener when the modal is open to avoid unnecessary work
	useEffect(() => {
		if (!isOpen) return;

		window.addEventListener("popstate", onPopState);
		return () => window.removeEventListener("popstate", onPopState);
	}, [isOpen]);

	// Fonction pour fermer proprement (pop l'entrée history pour éviter un back orphelin)
	const handleClose = () => {
		const entry = entryRef.current!;
		if (historyPushedRef.current) {
			// Reset ref AVANT history.back() pour que onPopState ne rappelle pas onClose
			historyPushedRef.current = false;
			removeEntry(entry);

			// `history.back()` ne reprend NOTRE entrée que si elle est encore au
			// sommet de l'historique. Si la longueur a augmenté depuis, quelqu'un a
			// empilé par-dessus — en pratique un `router.push` / `<Link>` déclenché
			// juste avant la fermeture (drawers de filtres, de tri, de navigation
			// par onglets). Reculer défairait cette navigation : le filtre qu'on
			// vient d'appliquer disparaîtrait de l'URL. On laisse alors notre entrée
			// enterrée — inoffensive, elle porte la même URL que la page.
			//
			// Couvre aussi la fermeture d'un parent alors qu'un enfant est encore
			// ouvert : reculer y consommerait l'entrée de l'enfant.
			const isTopOfHistory = history.length === historyLengthAtPushRef.current;

			if (isTopOfHistory) {
				// Signale aux autres écouteurs `popstate` (parent encore ouvert,
				// garde `use-unsaved-changes`) que le pop qui arrive est le nôtre.
				markOverlayInitiatedPop();
				history.back();
			}
		}
		onClose();
	};

	return { handleClose };
}
