"use client";

import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { XIcon } from "@phosphor-icons/react/ssr";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { Fade } from "@/shared/components/animations/fade";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";

import { SearchInput, type SearchInputHandle } from "@/shared/components/search-input";
import { Button } from "@/shared/components/ui/button";
import { Kbd } from "@/shared/components/ui/kbd";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/shared/components/ui/dialog";
import { useAddRecentSearch } from "@/modules/products/hooks/use-add-recent-search";
import { useRecentSearches } from "@/modules/products/hooks/use-recent-searches";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { cn } from "@/shared/utils/cn";
import { toast } from "@/shared/utils/toast";

import {
	MIN_SEARCH_LENGTH,
	PLACEHOLDER_CYCLE_MS,
	QUICK_SEARCH_DIALOG_ID,
	LISTBOX_ID,
	MIN_LENGTH_HINT_ID,
	RESULTS_CONTAINER_ID,
	SEARCH_DEBOUNCE_MS,
	SWIPE_CLOSE_THRESHOLD_PX,
	SWIPE_CLOSE_VELOCITY_PX_PER_MS,
	SWIPE_RUBBER_BAND_FACTOR,
} from "./constants";
import type { QuickSearchCollection, QuickSearchColor, QuickSearchProductType } from "./constants";
import { lastTrigger } from "./last-trigger";
import { IdleContent } from "./idle-content";
import { QuickSearchContent } from "./quick-search-content";
import { QuickTagPills } from "./quick-tag-pills";
import { SearchErrorState } from "./search-error-state";
import { SearchResultsSkeleton } from "./search-result-item";
import { useKeyboardNavigation } from "./use-keyboard-navigation";
import { isSearchError, useQuickSearch } from "./use-quick-search";

const EMPTY_RECENT_SEARCHES: string[] = [];
const EMPTY_COLORS: QuickSearchColor[] = [];

interface QuickSearchDialogProps {
	recentSearches?: string[];
	collections: QuickSearchCollection[];
	productTypes: QuickSearchProductType[];
	/**
	 * Le nuancier. Déjà vide côté serveur quand le catalogue porte trop peu de
	 * teintes pour qu'un mur veuille dire quelque chose (cf. `getQuickSearchData`).
	 */
	colors?: QuickSearchColor[];
}

export function QuickSearchDialog({
	recentSearches: initialSearches = EMPTY_RECENT_SEARCHES,
	collections,
	productTypes,
	colors = EMPTY_COLORS,
}: QuickSearchDialogProps) {
	const { isOpen, close } = useDialog(QUICK_SEARCH_DIALOG_ID);
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const searchInputRef = useRef<SearchInputHandle>(null);

	// Cmd+K / Ctrl+K shortcut lives in QuickSearchKeyboardShortcut so the
	// heavy dialog chunk stays unloaded until first open. See lazy wrapper.

	const { add } = useAddRecentSearch({
		onError: () => toast.error("Erreur lors de l'enregistrement"),
	});
	const { searches, remove, clear } = useRecentSearches({
		initialSearches,
		onRemoveError: () => toast.error("Erreur lors de la suppression"),
		onClearError: () => toast.error("Erreur lors de la suppression"),
	});

	// Suppression directe : retrait immédiat du terme / de toutes les recherches.
	const handleRemoveRecent = (term: string) => {
		remove(term);
	};

	const handleClearRecent = () => {
		if (searches.length === 0) return;
		clear();
	};

	/*
	 * Les deux hooks se dépendent mutuellement : `useKeyboardNavigation` a besoin
	 * d'`isSearchMode` **au rendu** (il détermine le mécanisme de roving et la
	 * valeur d'`aria-activedescendant`), tandis que `useQuickSearch` appelle
	 * `resetActiveIndex` à chaque frappe. On casse le cycle par un ref mis à jour
	 * dans un effet — plutôt qu'une écriture en cours de rendu, que le compilateur
	 * React refuse (`react-hooks/immutability`, cf. `setLastTrigger`).
	 */
	const resetActiveIndexRef = useRef<() => void>(() => {});

	const {
		inputValue,
		searchResults,
		searchQuery,
		isSearching,
		isSearchMode,
		handleInputValueChange,
		handleLiveSearch,
		handleSearchFromSuggestion,
		reset,
	} = useQuickSearch({
		searchInputRef,
		resetActiveIndex: () => resetActiveIndexRef.current(),
	});

	const {
		contentRef,
		handleArrowNavigation,
		handleContentKeyDown,
		resetActiveIndex,
		activeDescendantId,
	} = useKeyboardNavigation({
		isSearchMode,
		focusSearchInput: () => searchInputRef.current?.focus(),
	});

	useEffect(() => {
		resetActiveIndexRef.current = resetActiveIndex;
	});

	// Cleanup à la fermeture du dialog : `reset()` l'état de recherche pour qu'une
	// réouverture reparte propre — couvre les fermetures qui contournent
	// `handleClose` (sélection d'un résultat, « Voir les résultats »…).
	useEffect(() => {
		if (isOpen) return;
		reset();
		// On veut déclencher SEULEMENT à la fermeture du dialog. `reset` est stable
		// en pratique (call-sites stables).
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isOpen]);

	const hasPartialInput = inputValue.trim().length > 0 && !isSearchMode;

	const shouldReduceMotion = useReducedMotion();

	// Cycling placeholder through product types — disabled under reduced motion
	// (an indefinitely auto-updating placeholder is itself "motion" per WCAG 2.2.2).
	// Gardé sur `isOpen` : le composant reste monté à vie après la 1ʳᵉ ouverture
	// (lazy gate) — sans la garde, l'intervalle re-rendait le dialog FERMÉ toutes
	// les 3 s pour le reste de la session (audit recherche 2026-08-01, P3-4).
	const [placeholderIndex, setPlaceholderIndex] = useState(0);
	useEffect(() => {
		if (!isOpen || inputValue.length > 0 || productTypes.length === 0 || shouldReduceMotion) return;
		const id = setInterval(() => {
			setPlaceholderIndex((i) => (i + 1) % productTypes.length);
		}, PLACEHOLDER_CYCLE_MS);
		return () => clearInterval(id);
	}, [isOpen, inputValue.length, productTypes.length, shouldReduceMotion]);

	const currentType = productTypes[placeholderIndex];
	const placeholder = currentType ? `Rechercher : ${currentType.label}...` : "Rechercher un bijou…";
	// Under reduced motion the animated overlay is skipped: the plain (static)
	// placeholder above is shown instead.
	const showAnimatedPlaceholder =
		inputValue.length === 0 && productTypes.length > 0 && !shouldReduceMotion;

	const navigateToSearch = (term: string) => {
		if (isPending) return;
		add(term);
		triggerHaptic("medium");
		startTransition(() => {
			// `replace`, pas `push` : l'entrée poussée à l'ouverture par
			// `useBackButtonClose` porte l'URL de la page d'origine ; la consommer
			// évite une pression retour morte par cycle ouvrir→naviguer
			// (prescription CLAUDE.md § Overlays ; même règle sur les <Link> des
			// cartes et de l'idle). Verrouillé par
			// `close-reclaims-history.regression.test.tsx`.
			router.replace(`/produits?search=${encodeURIComponent(term)}`);
			close();
		});
	};

	const handleEnterKey = (term: string) => {
		const trimmed = term.trim();
		if (!trimmed) return;
		navigateToSearch(trimmed);
	};

	// Même comportement que les pills de suggestion : le terme remplit le champ
	// et la recherche s'affiche DANS le dialog (Entrée mène toujours à la PLP).
	// Naviguait avant directement vers /produits?search= — deux affordances
	// visuellement cousines, deux destinations (audit quick-search 2026-08-03).
	// Pas de `add()` : le terme est déjà dans les récentes, le ré-ajouter le
	// ferait remonter en tête à chaque clic.
	const handleRecentSearch = (term: string) => {
		resetActiveIndex();
		handleSearchFromSuggestion(term);
	};

	const handleQuickTagClick = (label: string) => {
		resetActiveIndex();
		handleSearchFromSuggestion(label);
	};

	const handleSelectResult = () => {
		triggerHaptic("light");
		add(searchQuery);
		close();
	};

	const handleViewAllResults = () => {
		navigateToSearch(searchQuery);
	};

	const handleClose = () => {
		close();
		reset();
	};

	// Le × est un `DialogClose` : la fermeture passe par Radix → `onOpenChange`
	// → `handleClose` du wrapper `ui/dialog`, qui REPREND l'entrée d'historique
	// poussée à l'ouverture. Un `close()` direct du store la laissait orpheline
	// (une pression retour avalée par cycle). Le swipe clique ce même bouton via
	// cette ref pour emprunter le même chemin.
	const closeButtonRef = useRef<HTMLButtonElement>(null);

	// Swipe-down-to-dismiss on mobile (triggered from header drag handle area).
	// Le drag écrit `transform` DIRECTEMENT sur le nœud du dialog (ref), sans
	// état React : un `setState` par `touchmove` re-rendait tout l'arbre du
	// dialog (liste de résultats, images, motion) à chaque frame de geste.
	// Rien à réinitialiser à la fermeture : Radix démonte le nœud, l'inline
	// style part avec lui.
	const dialogContentRef = useRef<HTMLDivElement>(null);
	const touchStartRef = useRef<{ y: number; t: number } | null>(null);
	const touchDeltaYRef = useRef(0);
	// Dernier échantillon de mouvement — vélocité instantanée lue au relâcher.
	const lastMoveRef = useRef({ y: 0, t: 0, velocity: 0 });
	const handleHeaderTouchStart = (e: React.TouchEvent<HTMLElement>) => {
		const y = e.touches[0]?.clientY;
		if (typeof y !== "number") return;
		touchStartRef.current = { y, t: e.timeStamp };
		touchDeltaYRef.current = 0;
		lastMoveRef.current = { y, t: e.timeStamp, velocity: 0 };
		const node = dialogContentRef.current;
		if (node) node.style.transition = "none";
	};
	const handleHeaderTouchMove = (e: React.TouchEvent<HTMLElement>) => {
		const start = touchStartRef.current;
		const y = e.touches[0]?.clientY;
		if (start === null || typeof y !== "number") return;
		const raw = y - start.y;
		touchDeltaYRef.current = raw;
		const last = lastMoveRef.current;
		const dt = e.timeStamp - last.t;
		if (dt > 0) {
			lastMoveRef.current = { y, t: e.timeStamp, velocity: (y - last.y) / dt };
		}
		// Rubber band upward (negative) drag; downward stays 1:1
		const offset = raw < 0 ? raw * SWIPE_RUBBER_BAND_FACTOR : raw;
		const node = dialogContentRef.current;
		if (node) node.style.transform = `translateY(${offset}px)`;
	};
	const handleHeaderTouchEnd = () => {
		const delta = touchDeltaYRef.current;
		const { velocity } = lastMoveRef.current;
		touchStartRef.current = null;
		touchDeltaYRef.current = 0;
		// Snap back animé vers 0 ; la transition inline reprend le rôle que
		// tenait l'ancien style JSX hors drag.
		const node = dialogContentRef.current;
		if (node) {
			node.style.transition = "transform var(--duration-normal) var(--ease-spring)";
			node.style.transform = "";
		}
		// Ferme sur la distance OU sur un flick rapide vers le bas (sous le seuil
		// de distance mais l'intention est aussi claire) — via le DialogClose
		// (cf. `closeButtonRef`), pour la reprise d'historique.
		if (
			delta > SWIPE_CLOSE_THRESHOLD_PX ||
			(delta > 0 && velocity > SWIPE_CLOSE_VELOCITY_PX_PER_MS)
		) {
			triggerHaptic("medium");
			closeButtonRef.current?.click();
		}
	};

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(open, eventDetails) => {
				if (open) return;

				// « Escape en deux temps ». Radix exposait un `onEscapeKeyDown` sur le
				// Content ; Base UI n'a plus qu'un point d'arbitrage — ce callback, avec
				// la RAISON de la fermeture et un `cancel()` lu juste après notre retour.
				// Texte présent → on annule la fermeture et on vide le champ ; champ
				// vide → on laisse fermer, ce qui reprend l'entrée d'historique du
				// wrapper. Verrouillé par `escape-two-step.regression.test.tsx`.
				if (eventDetails?.reason === "escape-key" && inputValue.length > 0) {
					eventDetails.cancel();
					searchInputRef.current?.clear();
					return;
				}

				handleClose();
			}}
		>
			<DialogContent
				showCloseButton={false}
				// Remplace l'ancien `onCloseAutoFocus` + `preventDefault` : rend le focus
				// à l'élément qui a ouvert le dialog (capturé dans `lastTrigger` avant
				// qu'il ne se blure lui-même).
				finalFocus={() => lastTrigger.el ?? false}
				aria-busy={isPending}
				ref={dialogContentRef}
				// Le wrapper anime un dialog CENTRÉ (zoom 95 % + sortie vers le HAUT).
				// Sous `md` cette surface est une feuille plein écran qu'on ferme d'un
				// swipe vers le BAS : ses transitions sont déclarées ici, et le défaut
				// doit être ÉTEINT à la source. Le surcharger ne suffirait pas —
				// `tailwind-merge` ne fusionne pas les utilitaires de `tw-animate-css`,
				// les deux jeux coexisteraient et l'ordre de la feuille de style
				// trancherait (cf. la prop côté `ui/dialog`).
				defaultTransformAnimation={false}
				className={cn(
					"group/search",
					// Mobile: bottom-sheet pleine hauteur (suit le clavier via --vvh, fallback 100dvh)
					"fixed inset-0 top-0 right-0 bottom-0 left-0 h-[var(--vvh,100dvh)] w-full max-w-none translate-x-0 translate-y-0",
					"overflow-hidden rounded-none border-0",
					// Base UI expose ses états en attributs BOOLÉENS (`data-open` /
					// `data-closed`), pas en `data-state`. Ces trois lignes ont porté la
					// forme Radix pendant toute la vie du composant : elles ne matchaient
					// rien, et rien ne le signalait (aucun conflit détecté par
					// tailwind-merge, `motion` mocké par tous les tests). La feuille
					// entrait donc en zoomant au centre et sortait VERS LE HAUT, à
					// contre-sens du geste qui la ferme. Audit DA 2026-08-05.
					"motion-safe:data-open:slide-in-from-bottom motion-safe:data-closed:slide-out-to-bottom",
					"flex flex-col",
					// Desktop: centered dialog, hauteur CONSTANTE 640px (capée à 85vh).
					//
					// ⚠️ Cette hauteur doit rester DÉFINIE — `md:h-auto md:max-h-[…]` a été
					// essayé et MESURÉ : la zone scrollable meurt. Toute la chaîne interne
					// (le `<div>` de `Fade`, puis le conteneur `scroll-fade-y`) est en
					// `h-full`, et un pourcentage se résout contre la hauteur SPÉCIFIÉE du
					// parent. Avec `height: auto` sur le panneau, `flex-1` donne bien à
					// `#qs-results` une hauteur calculée (387 px relevés), mais `h-full`
					// retombe sur `auto` et vaut la hauteur du CONTENU (544 px) : le scroller
					// ne déborde plus, donc ne scrolle plus, et `overflow-hidden` coupe
					// 157 px — dont le CTA « Voir tous les produits », devenu INATTEIGNABLE.
					// Rendre le panneau à la taille de son contenu demanderait de passer
					// toute cette chaîne en flex.
					//
					// Le vide de fin que le lot 3 visait (234 px à 390 px sans recherches
					// récentes) est de toute façon comblé par le nuancier : contenu mesuré à
					// 576 px pour 545 de zone visible, il déborde et scrolle.
					"md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2",
					"md:h-[min(640px,85vh)] md:w-full md:max-w-160 md:overflow-hidden md:rounded-xl md:border",
					// Au-dessus de `md` on retrouve un dialog centré. Les variantes `md:`
					// trient APRÈS les non-préfixées, donc elles écrasent bien la
					// translation plein écran ci-dessus.
					"motion-safe:md:data-open:slide-in-from-top-4 motion-safe:md:data-closed:slide-out-to-top-4",
					"motion-safe:md:data-open:zoom-in-95 motion-safe:md:data-closed:zoom-out-95",
				)}
			>
				{/* Header */}
				<header
					className={cn(
						"bg-background sticky top-0 z-10 shrink-0",
						"border-border border-b md:border-b-0",
					)}
					onTouchStart={handleHeaderTouchStart}
					onTouchMove={handleHeaderTouchMove}
					onTouchEnd={handleHeaderTouchEnd}
				>
					{/* Drag handle (mobile only) */}
					<div className="flex justify-center pt-2 pb-1 md:hidden" aria-hidden="true">
						<span className="bg-muted-foreground/30 h-1.5 w-10 rounded-full" />
					</div>
					<div className="flex h-14 items-center px-4">
						{/* Single close button: leftmost on mobile, rightmost on desktop (via order).
							 DialogClose (pas un onClick → close()) : cf. `closeButtonRef`. */}
						<DialogClose
							render={
								<Button
									ref={closeButtonRef}
									variant="ghost"
									size="icon"
									// ⚠️ JAMAIS `disabled={isPending}`. Pendant une navigation lente
									// (Neon froid, compilation dev), c'était la seule affordance
									// VISIBLE de sortie — et elle était morte exactement au moment où
									// l'on veut en sortir. Escape et le swipe restent disponibles mais
									// ne s'annoncent nulle part sur mobile. Fermer n'annule pas la
									// navigation en cours : elle aboutit, dialog fermé.
									className="order-first size-11 shrink-0 md:order-last"
									aria-label="Fermer"
								/>
							}
						>
							<XIcon className="size-5" />
						</DialogClose>

						<DialogTitle className="font-display flex-1 text-center text-lg font-medium md:text-left">
							Rechercher
						</DialogTitle>
						<DialogDescription className="sr-only">
							Recherche un bijou par nom ou parcours les collections et catégories.
						</DialogDescription>

						{/* Spacer mirrors the close button width to keep the title centered on mobile */}
						<div className="order-last size-11 shrink-0 md:hidden" aria-hidden="true" />
					</div>
				</header>

				{/* Search Input — le landmark `search` est fourni par le <form> de SearchInput */}
				<div className="bg-background shrink-0 px-4 py-3" data-pending={isPending ? "" : undefined}>
					<div className="relative overflow-hidden">
						<SearchInput
							ref={searchInputRef}
							// `paramName` is inert here: `onLiveSearch` bypasses URL syncing.
							paramName="qs"
							debounceMs={SEARCH_DEBOUNCE_MS}
							size="md"
							placeholder={showAnimatedPlaceholder ? " " : placeholder}
							aria-label="Rechercher un bijou"
							// eslint-disable-next-line jsx-a11y/no-autofocus
							autoFocus
							preventMobileBlur
							isPending={isSearching}
							onLiveSearch={handleLiveSearch}
							onEscape={handleClose}
							onValueChange={handleInputValueChange}
							onSubmit={handleEnterKey}
							// Sémantique combobox uniquement en mode recherche. En idle le panneau
							// est une surface de navigation (sections, recherches récentes,
							// collections) : le popup est réputé fermé, sans descendant actif —
							// c'est l'état correct, pas un défaut. Les flèches y déplacent le
							// focus DOM réel, que le lecteur d'écran annonce sans ARIA.
							//
							// `aria-controls` vise le LISTBOX (`LISTBOX_ID`), pas le conteneur de
							// navigation : c'est le popup du combobox, et lui seul ne contient que
							// des options.
							aria-activedescendant={activeDescendantId}
							aria-expanded={isSearchMode}
							aria-controls={isSearchMode ? LISTBOX_ID : undefined}
							aria-describedby={hasPartialInput ? MIN_LENGTH_HINT_ID : undefined}
							// ARIA 1.2 combobox: the input keeps focus, so arrow/Home/End/Enter
							// navigation must be handled here — not on the listbox container.
							onKeyDown={handleArrowNavigation}
						/>
						{showAnimatedPlaceholder && (
							<div
								className="pointer-events-none absolute inset-y-0 left-12 flex items-center"
								aria-hidden="true"
							>
								<span className="text-muted-foreground text-sm">
									Rechercher :{" "}
									<AnimatePresence mode="wait" initial={false}>
										<m.span
											key={placeholderIndex}
											className="inline-block"
											initial={{ y: 6, opacity: 0 }}
											animate={{ y: 0, opacity: 1 }}
											exit={{ y: -6, opacity: 0 }}
											transition={{
												// `showAnimatedPlaceholder` is already false under reduced motion,
												// so this branch only runs when motion is allowed.
												duration: MOTION_CONFIG.duration.medium,
												ease: MOTION_CONFIG.easing.easeOut,
											}}
										>
											{currentType?.label}...
										</m.span>
									</AnimatePresence>
								</span>
							</div>
						)}
					</div>
				</div>

				{/* Quick suggestion tags (idle only).
					`layout="row"` — UNE ligne défilante, pas un enroulement. Mesuré au
					navigateur : en enroulement, 7 catégories prenaient 3 lignes (152 px), la
					moitié du chrome au-dessus de la zone de contenu, pour une dernière ligne
					portant une seule pilule. Clavier ouvert (`--vvh` ≈ 508 px) il ne restait
					alors que 209 px pour TOUT le contenu, et le nuancier lui-même y était
					coupé. Cf. le commentaire de la prop. Audit UI/UX 2026-08-05, lot 5. */}
				{!isSearchMode && productTypes.length > 0 && (
					<div className="bg-background shrink-0 px-4 pb-2">
						<QuickTagPills
							productTypes={productTypes}
							onSelect={handleQuickTagClick}
							size="sm"
							layout="row"
						/>
					</div>
				)}

				{/* Hint when input is too short — live region ET `aria-describedby` du
					champ. C'était un simple `<p>` : un utilisateur de lecteur d'écran qui
					tapait « ba » n'entendait rien du tout, et n'avait aucun moyen de savoir
					pourquoi aucun résultat n'arrivait. Audit recherche 2026-07-26. */}
				{hasPartialInput && (
					<p
						id={MIN_LENGTH_HINT_ID}
						role="status"
						aria-live="polite"
						className="text-muted-foreground px-4 pb-2 text-xs"
					>
						Tape au moins {MIN_SEARCH_LENGTH} caractères pour rechercher
					</p>
				)}

				{/* Screen reader announcements (search mode is announced by QuickSearchContent) */}
				<div role="status" aria-live="polite" className="sr-only">
					{!isSearchMode && (
						<>
							{searches.length > 0 &&
								`${searches.length} recherche${searches.length > 1 ? "s" : ""} récente${searches.length > 1 ? "s" : ""}.`}
							{collections.length > 0 &&
								` ${collections.length} collection${collections.length > 1 ? "s" : ""}.`}
							{productTypes.length > 0 &&
								` ${productTypes.length} catégorie${productTypes.length > 1 ? "s" : ""}.`}
						</>
					)}
				</div>

				{/* Conteneur de résultats = **périmètre de NAVIGATION**, dans les deux
					 modes. Il ne porte plus le `role="listbox"` : celui-ci vit désormais sur
					 un élément interne (`LISTBOX_ID`, rendu par `QuickSearchContent`) qui
					 n'enveloppe que des `group`/`option`. Le rôle portait ici sur un
					 conteneur qui contient aussi l'état vide, la suggestion, les messages
					 d'erreur et le CTA — des enfants qu'un listbox n'a pas le droit d'avoir.
					 La décision F3 (« pas de listbox en idle ») est préservée, et même
					 renforcée : il n'y a plus d'option orpheline nulle part.

					 tabIndex={-1} makes it programmatically focusable to satisfy jsx-a11y
					 while keeping it out of the Tab order. */}
				{/* eslint-disable jsx-a11y/no-static-element-interactions --
					 onMouseLeave only clears the roving keyboard highlight (a pointer-only
					 affordance; arrow-key navigation works without it). En idle, onKeyDown
					 poursuit le roving au focus réel une fois que le focus a quitté l'input. */}
				<div
					ref={contentRef}
					id={RESULTS_CONTAINER_ID}
					tabIndex={-1}
					onKeyDown={handleContentKeyDown}
					className={cn(
						"min-h-0 flex-1 overflow-hidden overscroll-contain",
						"group-has-[[data-pending]]/search:opacity-50",
						"group-has-[[data-pending]]/search:pointer-events-none",
						"transition-opacity duration-200",
					)}
					onMouseLeave={resetActiveIndex}
				>
					{/* Pas d'`AnimatePresence` ici : il n'envelopperait que des `<Fade>`,
						qui rendent un `<div>` nu piloté par une keyframe CSS. Or
						`AnimatePresence` ne peut différer un démontage que pour un composant
						`motion` — il était donc INERTE, et montait `motion/react` pour rien
						dans le chemin chaud. Audit DA 2026-08-05. */}
					{isSearchMode ? (
						<Fade key="search-results" y={6} className="h-full">
							{isSearching && (!searchResults || isSearchError(searchResults)) ? (
								<SearchResultsSkeleton />
							) : isSearchError(searchResults) ? (
								// Erreur CLIENT/RÉSEAU. L'erreur SERVEUR (`kind: "error"`) est
								// rendue par `QuickSearchContent` — deux chemins distincts,
								// même UI, mutualisée pour qu'elle ne diverge plus.
								<SearchErrorState onRetry={() => handleLiveSearch(searchQuery)} />
							) : searchResults ? (
								<QuickSearchContent
									results={searchResults}
									query={searchQuery}
									colors={colors}
									collections={collections}
									productTypes={productTypes}
									onSearch={handleSearchFromSuggestion}
									onClose={handleClose}
									onSelectResult={handleSelectResult}
									onViewAllResults={handleViewAllResults}
									onRetry={() => handleLiveSearch(searchQuery)}
								/>
							) : (
								<SearchResultsSkeleton />
							)}
						</Fade>
					) : (
						/* ====== IDLE MODE ====== */
						<Fade key="idle-content" y={6} className="h-full">
							<IdleContent
								searches={searches}
								colors={colors}
								collections={collections}
								onClose={handleClose}
								onRecentSearch={handleRecentSearch}
								onRemoveSearch={handleRemoveRecent}
								onClearSearches={handleClearRecent}
								isPending={isPending}
							/>
						</Fade>
					)}
				</div>
				{/* eslint-enable jsx-a11y/no-static-element-interactions */}

				{/* Keyboard hints — desktop only, purely decorative (the shortcuts work
					 regardless; this just surfaces them since results are reached via
					 arrow keys, not Tab). */}
				{/* `Kbd` partagé plutôt qu'un `<kbd>` remis à la main trois fois.
					 Volontairement `Kbd` et non `ShortcutKbd` : cette rangée est `aria-hidden`
					 et décorative — la détection de plateforme de `ShortcutKbd` y serait payée
					 pour rien. Les deux ont des rôles distincts (glyphe statique vs
					 accélérateur vivant) et ne sont PAS des doublons. */}
				<div
					aria-hidden="true"
					className="border-border text-muted-foreground hidden shrink-0 items-center justify-center gap-4 border-t px-4 py-2 text-xs md:flex"
				>
					<span className="flex items-center gap-1.5">
						<Kbd>↑↓</Kbd>
						naviguer
					</span>
					<span className="flex items-center gap-1.5">
						<Kbd>↵</Kbd>
						ouvrir
					</span>
					<span className="flex items-center gap-1.5">
						<Kbd>esc</Kbd>
						fermer
					</span>
				</div>

				{/* Safe area bottom spacer */}
				<div className="bg-background h-[env(safe-area-inset-bottom,0)] shrink-0 md:hidden" />
			</DialogContent>
		</Dialog>
	);
}
