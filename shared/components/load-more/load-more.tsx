"use client";

import {
	useActionState,
	useEffect,
	useEffectEvent,
	useRef,
	type CSSProperties,
	type ReactNode,
} from "react";

import { Button } from "@/shared/components/ui/button";
import { Spinner } from "@/shared/components/ui/spinner";
import { useInView } from "@/shared/hooks/use-in-view";
import { toast } from "@/shared/utils/toast";

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
 * sous ses doigts. Seul un `user` (clic sur le bouton) déplace le focus.
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
	/** Stable key extractor. */
	getItemKey: (item: TItem) => string;
	/** Singular label (ex. "produit"). Used in counter + sr announcement. */
	itemsLabel: string;
	/**
	 * Plural label (ex. "produits").
	 *
	 * Requis, jamais deviné : `${itemsLabel}s` produit « bijous », « chevals ».
	 */
	itemsLabelPlural: string;
	/**
	 * Tailwind classes for the appended items container.
	 *
	 * Requis : le défaut qui vivait ici (`grid-cols-1 lg:grid-cols-2`) ne
	 * correspondait à aucune grille du dépôt et n'était utilisé par personne.
	 */
	itemsContainerClassName: string;
	/**
	 * Classe posée sur CHAQUE cellule ajoutée, en plus de `--item-index`.
	 *
	 * Sert à réutiliser l'animation d'entrée de la grille hôte plutôt qu'à en
	 * réinventer une — cf. le commentaire de `LoadMore` ci-dessous.
	 */
	itemClassName?: string;
	/** Button label. Defaults to "Voir plus". */
	buttonLabel?: string;
	/** Generic error message for unexpected throws. */
	errorMessage?: string;
	/** Enable IntersectionObserver auto-load when button is 80% visible. */
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
 * ## L'état tient en UN `useActionState`
 *
 * Les pages chargées, le curseur, `hasMore` et le pending sont **une seule
 * donnée** ; les éclater en quatre `useState` avait produit un bug d'annonce :
 * la phrase lue au lecteur d'écran dérivait de `additionalItems.length` capturé
 * dans la closure du rendu, pas de l'état commité. Le réducteur d'un
 * `useActionState` reçoit toujours le `prev` commité — le défaut ne peut plus se
 * reformer. Bénéfice collatéral : React sérialise les dispatches, donc un
 * double-tap n'envoie plus deux fois le même curseur.
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
	getItemKey,
	itemsLabel,
	itemsLabelPlural,
	itemsContainerClassName,
	itemClassName,
	buttonLabel = "Voir plus",
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
					toast.error(result.error);
					return prev;
				}

				return {
					batches: [...prev.batches, result.items],
					cursor: result.nextCursor,
					hasMore: result.hasMore,
					lastTrigger: trigger,
				};
			} catch {
				toast.error(errorMessage);
				return prev;
			}
		},
		{
			batches: [],
			cursor: initialCursor,
			hasMore: initialHasMore,
			lastTrigger: "user",
		},
	);

	const buttonRef = useRef<HTMLButtonElement | null>(null);
	const firstNewItemRef = useRef<HTMLDivElement | null>(null);
	const autoLoadedCursorRef = useRef<string | null>(null);

	const loadCount = state.batches.length;
	const appendedCount = state.batches.reduce((total, batch) => total + batch.length, 0);
	const lastBatchSize = state.batches.at(-1)?.length ?? 0;
	const displayedCount = initialDisplayedCount + appendedCount;

	// Après un chargement DEMANDÉ, le focus va au premier item du NOUVEAU lot.
	//
	// Deux garde-fous, chacun corrigeant un défaut constaté : la cible est
	// recalculée par lot (elle était figée sur le tout premier item ajouté, donc
	// au 2ᵉ clic le focus REMONTAIT au-dessus des nouveaux items), et un
	// chargement `auto` ne la déplace pas du tout (l'observer volait le focus en
	// plein défilement, `.focus()` faisant sauter la page au passage).
	useEffect(() => {
		if (loadCount === 0 || state.lastTrigger !== "user") return;
		firstNewItemRef.current?.focus({ preventScroll: true });
	}, [loadCount, state.lastTrigger]);

	const isButtonVisible = useInView(buttonRef, {
		threshold: autoLoadThreshold,
		rootMargin: autoLoadRootMargin,
		enabled: enableAutoLoad && state.hasMore && !!state.cursor,
	});

	// Un curseur n'est auto-chargé qu'UNE fois.
	//
	// Conséquence voulue en cas d'échec : le curseur reste marqué alors que
	// l'état n'a pas avancé, donc l'auto-load s'arrête là — c'est le bon repli,
	// il évite une boucle de retry tant que le bouton est à l'écran. Le bouton
	// manuel, lui, reste opérant : il ne consulte pas ce ref.
	const triggerAutoLoad = useEffectEvent(() => {
		if (!state.cursor) return;
		if (autoLoadedCursorRef.current === state.cursor) return;
		autoLoadedCursorRef.current = state.cursor;
		load("auto");
	});

	// `isPending` DOIT rester dans les deps : c'est son retour à `false` qui
	// relance la chaîne pendant que le bouton reste visible.
	//
	// ⚠️ Cet effet ne dispatche jamais au MONTAGE, et c'est nécessaire :
	// `useInView` est SSR-safe (il s'initialise à `false` et ne passe à `true` que
	// depuis le callback de l'observer, donc après le montage). Une action
	// `useActionState` dispatchée depuis l'effet de montage s'exécute mais sa
	// valeur de retour n'est pas commitée — rendre `isButtonVisible` vrai dès le
	// premier rendu ferait donc un auto-load silencieusement sans effet.
	useEffect(() => {
		if (!enableAutoLoad || !isButtonVisible || isPending) return;
		triggerAutoLoad();
	}, [enableAutoLoad, isButtonVisible, isPending]);

	if (!state.hasMore && appendedCount === 0) {
		return null;
	}

	const isPlural = lastBatchSize > 1;
	const statusMessage =
		loadCount === 0
			? ""
			: `${lastBatchSize} nouveau${isPlural ? "x" : ""} ${isPlural ? itemsLabelPlural : itemsLabel} chargé${isPlural ? "s" : ""}. ${displayedCount} sur ${totalCount} ${itemsLabelPlural} affichés.`;

	// `role="status"` implique déjà `aria-live="polite"` — le doubler n'ajoutait rien.
	return (
		<>
			<p role="status" className="sr-only">
				{statusMessage}
			</p>

			{appendedCount > 0 && (
				/*
				 * Pas de `<ul role="list">` ici — volontairement.
				 *
				 * Les cellules ajoutées prolongent une grille hôte qui n'est pas une
				 * liste (cf. l'arbitrage de `product-list.tsx`) : les envelopper dans
				 * une liste faisait annoncer « liste, N éléments » pour ce seul bloc,
				 * au milieu d'une grille qui n'en est pas une. Chaque item porte déjà
				 * son propre rôle et son propre nom accessible.
				 */
				<div className={itemsContainerClassName}>
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
				</div>
			)}

			{(state.hasMore || appendedCount > 0) && (
				<div className="flex flex-col items-center gap-2 pt-2">
					{totalCount > 0 && (
						<p className="text-muted-foreground text-sm">
							{displayedCount} sur {totalCount} {itemsLabelPlural} affichés
						</p>
					)}
					{state.hasMore && (
						<Button
							ref={buttonRef}
							variant="outline"
							onClick={() => {
								if (isPending) return;
								load("user");
							}}
							disabled={isPending}
							aria-busy={isPending}
							className="min-w-[200px]"
						>
							{isPending ? (
								<>
									<Spinner presentational className="mr-2" />
									Chargement…
								</>
							) : (
								buttonLabel
							)}
						</Button>
					)}
				</div>
			)}
		</>
	);
}
