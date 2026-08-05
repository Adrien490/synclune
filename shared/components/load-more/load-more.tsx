"use client";

import {
	useActionState,
	useEffect,
	useEffectEvent,
	useRef,
	type CSSProperties,
	type ReactNode,
} from "react";

import { useInView } from "@/shared/hooks/use-in-view";

interface LoadMoreResult<TItem> {
	items: TItem[];
	nextCursor: string | null;
	hasMore: boolean;
	error?: string;
}

/**
 * Qui a demandé le chargement.
 *
 * Décide si le focus bouge : un chargement `auto` vient de l'IntersectionObserver
 * pendant que l'utilisateur défile — lui prendre le focus ferait sauter la page
 * sous ses doigts. Seul un `user` (activation de l'affordance) déplace le focus.
 */
type LoadTrigger = "user" | "auto";

/**
 * État accumulé, keyé sur les LOTS et non sur une liste plate.
 *
 * ⚠️ Cette forme n'est pas cosmétique : `--item-index` doit rester STABLE pour un
 * item donné. Avec une liste plate, l'index d'un item du lot 1 se recalculerait à
 * chaque nouveau lot, donc `animation-delay` changerait sur des nœuds dont
 * l'animation est déjà terminée. Découpé en lots, l'index d'un item est fixé à
 * son insertion et ne bouge plus jamais.
 */
interface LoadMoreState<TItem> {
	/** Un tableau par chargement réussi. L'index DANS le lot pilote le stagger. */
	batches: TItem[][];
	cursor: string | null;
	hasMore: boolean;
	lastTrigger: LoadTrigger;
	/**
	 * Message du dernier échec, ou `null`.
	 *
	 * ⚠️ Il vit dans l'ÉTAT, pas dans un toast. Un toast s'évapore en quelques
	 * secondes ; or l'auto-load ne rejoue jamais un curseur déjà consommé, donc
	 * après un échec le chargement s'arrête DÉFINITIVEMENT. Sans trace
	 * persistante, le catalogue paraissait simplement fini — « 40 sur 62 », et
	 * les 22 restantes invisibles. C'est l'affordance qui affiche ce message,
	 * là où le chargement s'est arrêté.
	 */
	error: string | null;
}

/**
 * Ce que l'affordance reçoit pour se peindre.
 *
 * Tout est DÉRIVÉ de l'état commité : aucun compteur parallèle à resynchroniser.
 */
export interface LoadMoreAffordanceState {
	/** Total déjà affiché (rendu serveur + lots ajoutés). */
	displayedCount: number;
	/** Total de la requête, tous lots confondus. */
	totalCount: number;
	/** Ce qu'il reste à charger. Jamais négatif. */
	remainingCount: number;
	/** Nombre de lots déjà chargés — pilote le journal de progression. */
	loadCount: number;
	/** Une requête est en vol. */
	isPending: boolean;
	/** Le dernier chargement a échoué ; le message est prêt à afficher. */
	error: string | null;
	/** Il reste une page à charger. */
	hasMore: boolean;
}

interface LoadMoreProps<TItem> {
	/** Initial cursor (last id of the server-rendered page). */
	initialCursor: string | null;
	/** Whether the server reports more pages available. */
	initialHasMore: boolean;
	/** Number of items already displayed (server-rendered). */
	initialDisplayedCount: number;
	/** Total matching items across all pages (counter denominator). */
	totalCount: number;
	/** Server action loading the next page. */
	loadFn: (cursor: string) => Promise<LoadMoreResult<TItem>>;
	/** Render-prop for each item. Receives the index relative to *all* additional items. */
	renderItem: (item: TItem, index: number) => ReactNode;
	/**
	 * Rend l'affordance — la cellule qui annonce ce qu'il reste et va le chercher.
	 *
	 * Render-prop, et non un bouton en dur : ce module tient la MÉCANIQUE
	 * (accumulation, curseur, focus, annonce) ; l'apparence appartient à la
	 * grille appelante, comme l'animation d'entrée. `ref` doit être posé sur
	 * l'élément observé par l'IntersectionObserver, `onLoad` sur son activation.
	 */
	renderAffordance: (
		state: LoadMoreAffordanceState,
		handlers: {
			onLoad: () => void;
			ref: (node: HTMLElement | null) => void;
		},
	) => ReactNode;
	/** Stable key extractor. */
	getItemKey: (item: TItem) => string;
	/** Singular label (ex. "pièce"). Used in the sr announcement. */
	itemsLabel: string;
	/**
	 * Plural label (ex. "pièces").
	 *
	 * Requis, jamais deviné : `${itemsLabel}s` produit « bijous », « chevals ».
	 */
	itemsLabelPlural: string;
	/**
	 * Genre grammatical du libellé, pour l'accord de la phrase annoncée.
	 *
	 * ⚠️ Requis dès que le libellé est féminin : le gabarit accorde « nouveau /
	 * nouvelle » et « chargé / chargée ». Avec « pièce » et le défaut masculin,
	 * un lecteur d'écran entendait « 1 nouveau pièce chargé ». Même classe de
	 * défaut que le « 1 nouvel produit » corrigé le 2026-08-04 — invisible en
	 * revue visuelle, puisque la phrase est `sr-only`.
	 */
	itemsGender?: "m" | "f";
	/**
	 * Classe posée sur CHAQUE cellule ajoutée, en plus de `--item-index`.
	 *
	 * Sert à réutiliser l'animation d'entrée de la grille hôte plutôt qu'à en
	 * réinventer une — cf. le commentaire de `LoadMore` ci-dessous.
	 */
	itemClassName?: string;
	/** Generic error message for unexpected throws. */
	errorMessage?: string;
	/** Enable IntersectionObserver auto-load when the affordance is 80% visible. */
	enableAutoLoad?: boolean;
	/** Auto-load threshold (0..1). Default 0.8. */
	autoLoadThreshold?: number;
	/** Auto-load rootMargin (preload before visible). */
	autoLoadRootMargin?: string;
}

/**
 * Generic Load More component.
 *
 * Append-style pagination (vs. URL-driven CursorPagination): keeps server-rendered
 * items + appends additional items in local state. Used for feeds (product
 * catalogue on mobile) where lecture passive prime sur navigation ciblée.
 *
 * ## Il ne rend AUCUN conteneur
 *
 * Ses cellules et son affordance sont des enfants directs de la grille
 * appelante — même montage que `ProductList`. C'est structurel, pas cosmétique :
 * tant qu'il rendait sa propre grille (prop `itemsContainerClassName`, retirée),
 * les items ajoutés formaient une SECONDE grille imbriquée dans une cellule
 * pleine largeur, précédée d'un `mt-6`. La gouttière passait donc de 16 px à
 * 40 px exactement à la frontière « rendu serveur / chargé par le navigateur »,
 * sur une page dont tout le concept est de n'avoir qu'une seule grille.
 *
 * ## L'état tient en UN `useActionState`
 *
 * Les pages chargées, le curseur, `hasMore`, l'erreur et le pending sont **une
 * seule donnée** ; les éclater en plusieurs `useState` avait produit un bug
 * d'annonce : la phrase lue au lecteur d'écran dérivait de
 * `additionalItems.length` capturé dans la closure du rendu, pas de l'état
 * commité. Le réducteur d'un `useActionState` reçoit toujours le `prev` commité —
 * le défaut ne peut plus se reformer. Bénéfice collatéral : React sérialise les
 * dispatches, donc un double-tap n'envoie plus deux fois le même curseur.
 *
 * Tout le reste (compteur, phrase annoncée, index de focus) est **dérivé au
 * rendu** : aucun setter, donc aucune valeur à resynchroniser.
 *
 * ## Le parent DOIT remonter via `key`
 *
 * ⚠️ `useActionState` fige son état initial : changer `initialCursor` ne le
 * réinitialise pas. Le parent doit donc remonter le composant via une `key`
 * dérivée des searchParams de filtre/tri, sinon un changement de filtre garderait
 * les pages de l'ancien jeu de résultats. C'est structurel, pas une précaution.
 *
 * ## L'animation d'entrée appartient à la grille hôte
 *
 * Les cellules ajoutées ne portent aucune animation en propre : elles reçoivent
 * `itemClassName` + `--item-index` (index DANS le lot) et laissent la grille
 * appelante décider. Ce composant animait auparavant ses items avec un
 * `slide-in-from-bottom` inline pendant que la grille hôte faisait un crossfade —
 * deux animations différentes dans une seule grille, dont l'une avec un délai
 * plafonné à `Math.min(index, 9)` qui supprimait tout stagger dès le 2ᵉ lot.
 */
export function LoadMore<TItem>({
	initialCursor,
	initialHasMore,
	initialDisplayedCount,
	totalCount,
	loadFn,
	renderItem,
	renderAffordance,
	getItemKey,
	itemsLabel,
	itemsLabelPlural,
	itemsGender = "m",
	itemClassName,
	errorMessage = "Impossible de charger plus d'éléments",
	enableAutoLoad = false,
	autoLoadThreshold = 0.8,
	autoLoadRootMargin,
}: LoadMoreProps<TItem>) {
	const [state, load, isPending] = useActionState<LoadMoreState<TItem>, LoadTrigger>(
		async (prev, trigger) => {
			if (!prev.cursor) return prev;

			try {
				const result = await loadFn(prev.cursor);

				if (result.error) {
					return { ...prev, lastTrigger: trigger, error: result.error };
				}

				return {
					batches: [...prev.batches, result.items],
					cursor: result.nextCursor,
					hasMore: result.hasMore,
					lastTrigger: trigger,
					error: null,
				};
			} catch {
				return { ...prev, lastTrigger: trigger, error: errorMessage };
			}
		},
		{
			batches: [],
			cursor: initialCursor,
			hasMore: initialHasMore,
			lastTrigger: "user",
			error: null,
		},
	);

	const affordanceRef = useRef<HTMLElement | null>(null);
	const firstNewItemRef = useRef<HTMLDivElement | null>(null);
	const autoLoadedCursorRef = useRef<string | null>(null);

	const loadCount = state.batches.length;
	const appendedCount = state.batches.reduce((total, batch) => total + batch.length, 0);
	const lastBatchSize = state.batches.at(-1)?.length ?? 0;
	const displayedCount = initialDisplayedCount + appendedCount;
	const remainingCount = Math.max(0, totalCount - displayedCount);

	// Après un chargement DEMANDÉ, le focus va au premier item du NOUVEAU lot.
	//
	// Trois garde-fous, chacun corrigeant un défaut constaté : la cible est
	// recalculée par lot (elle était figée sur le tout premier item ajouté, donc
	// au 2ᵉ clic le focus REMONTAIT au-dessus des nouveaux items) ; un chargement
	// `auto` ne la déplace pas du tout (l'observer volait le focus en plein
	// défilement) ; et l'effet se déclenche aussi quand `error` change, parce
	// qu'un ÉCHEC ne fait pas bouger `loadCount` — le focus, parti de
	// l'affordance pendant l'attente, ne serait jamais rendu à personne.
	useEffect(() => {
		if (state.lastTrigger !== "user") return;
		if (state.error) {
			affordanceRef.current?.focus({ preventScroll: true });
			return;
		}
		if (loadCount === 0) return;
		firstNewItemRef.current?.focus({ preventScroll: true });
	}, [loadCount, state.lastTrigger, state.error]);

	const isAffordanceVisible = useInView(affordanceRef, {
		threshold: autoLoadThreshold,
		rootMargin: autoLoadRootMargin,
		enabled: enableAutoLoad && state.hasMore && !!state.cursor,
	});

	// Un curseur n'est auto-chargé qu'UNE fois.
	//
	// Conséquence voulue en cas d'échec : le curseur reste marqué alors que
	// l'état n'a pas avancé, donc l'auto-load s'arrête là — c'est le bon repli,
	// il évite une boucle de retry tant que l'affordance est à l'écran. L'appui
	// manuel, lui, reste opérant : il ne consulte pas ce ref.
	const triggerAutoLoad = useEffectEvent(() => {
		if (!state.cursor) return;
		if (autoLoadedCursorRef.current === state.cursor) return;
		autoLoadedCursorRef.current = state.cursor;
		load("auto");
	});

	// `isPending` DOIT rester dans les deps : c'est son retour à `false` qui
	// relance la chaîne pendant que l'affordance reste visible.
	//
	// ⚠️ Cet effet ne dispatche jamais au MONTAGE, et c'est nécessaire :
	// `useInView` est SSR-safe (il s'initialise à `false` et ne passe à `true` que
	// depuis le callback de l'observer, donc après le montage). Une action
	// `useActionState` dispatchée depuis l'effet de montage s'exécute mais sa
	// valeur de retour n'est pas commitée — rendre `isAffordanceVisible` vrai dès
	// le premier rendu ferait donc un auto-load silencieusement sans effet.
	useEffect(() => {
		if (!enableAutoLoad || !isAffordanceVisible || isPending) return;
		triggerAutoLoad();
	}, [enableAutoLoad, isAffordanceVisible, isPending]);

	if (!state.hasMore && appendedCount === 0) {
		return null;
	}

	const isPlural = lastBatchSize > 1;
	const isFeminine = itemsGender === "f";
	const newWord = isFeminine ? `nouvelle${isPlural ? "s" : ""}` : `nouveau${isPlural ? "x" : ""}`;
	const loadedWord = `chargé${isFeminine ? "e" : ""}${isPlural ? "s" : ""}`;
	const shownWord = `affiché${isFeminine ? "e" : ""}s`;
	const statusMessage =
		loadCount === 0
			? ""
			: `${lastBatchSize} ${newWord} ${isPlural ? itemsLabelPlural : itemsLabel} ${loadedWord}. ${displayedCount} sur ${totalCount} ${itemsLabelPlural} ${shownWord}.`;

	const setAffordanceRef = (node: HTMLElement | null) => {
		affordanceRef.current = node;
	};

	const handleLoad = () => {
		if (isPending) return;
		load("user");
	};

	// `role="status"` implique déjà `aria-live="polite"` — le doubler n'ajoutait rien.
	return (
		<>
			<p role="status" className="sr-only">
				{statusMessage}
			</p>

			{/*
			 * Pas de `<ul role="list">` ici — volontairement.
			 *
			 * Les cellules ajoutées prolongent une grille hôte qui n'est pas une
			 * liste (cf. l'arbitrage de `product-list.tsx`) : les envelopper dans
			 * une liste faisait annoncer « liste, N éléments » pour ce seul bloc,
			 * au milieu d'une grille qui n'en est pas une. Chaque item porte déjà
			 * son propre rôle et son propre nom accessible.
			 */}
			{state.batches.flatMap((batch, batchIndex) => {
				const isLastBatch = batchIndex === state.batches.length - 1;
				const batchOffset = state.batches
					.slice(0, batchIndex)
					.reduce((total, previous) => total + previous.length, 0);

				return batch.map((item, indexInBatch) => {
					const isFirstOfBatch = indexInBatch === 0;

					return (
						<div
							key={getItemKey(item)}
							// Le ref ne suit que le DERNIER lot, mais `tabIndex` est posé
							// sur le premier item de CHAQUE lot : le retirer d'un élément
							// qui a le focus renverrait ce focus sur `<body>`.
							ref={isFirstOfBatch && isLastBatch ? firstNewItemRef : undefined}
							tabIndex={isFirstOfBatch ? -1 : undefined}
							className={itemClassName}
							style={{ "--item-index": indexInBatch } as CSSProperties}
						>
							{renderItem(item, batchOffset + indexInBatch)}
						</div>
					);
				});
			})}

			{/*
			 * L'affordance survit à la fin du catalogue **si l'on a réellement
			 * chargé quelque chose** : c'est là qu'elle devient la signature
			 * « c'est tout pour aujourd'hui », et une page qui s'arrête sur du
			 * blanc ne dit pas si elle est finie ou cassée. En revanche, quand il
			 * n'y a jamais eu de page suivante (petit catalogue), le composant
			 * rend `null` plus haut — pas de cérémonie pour rien.
			 */}
			{(state.hasMore || state.error !== null || appendedCount > 0) &&
				renderAffordance(
					{
						displayedCount,
						totalCount,
						remainingCount,
						loadCount,
						isPending,
						error: state.error,
						hasMore: state.hasMore,
					},
					// eslint-disable-next-line react-hooks/refs -- `setAffordanceRef` ÉCRIT le ref, il ne le lit jamais : `.current` n'est déréférencé que dans un effet (le focus après échec) et dans `useInView`. La règle ne peut pas distinguer un ref-setter d'une lecture pendant le rendu.
					{ onLoad: handleLoad, ref: setAffordanceRef },
				)}
		</>
	);
}
