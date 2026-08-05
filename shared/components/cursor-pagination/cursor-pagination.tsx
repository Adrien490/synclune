"use client";

import { CaretDoubleLeftIcon, CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react/ssr";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useEffectEvent, useId, type ComponentProps } from "react";

import { ButtonGroup } from "@/shared/components/ui/button-group";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/components/ui/select";
import { Spinner } from "@/shared/components/ui/spinner";
import { FINE_POINTER_QUERY } from "@/shared/constants/pointer";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useMediaQuery } from "@/shared/hooks/use-media-query";
import { DEFAULT_PER_PAGE, PER_PAGE_OPTIONS } from "@/shared/lib/pagination";
import type { CursorPaginationProps } from "@/shared/types/component.types";
import { cn } from "@/shared/utils/cn";
import { isInteractiveTarget } from "@/shared/utils/is-interactive-target";

import { Button } from "../ui/button";
import { NAV_BUTTON_SIZE, PAGE_INDICATOR_SIZE, RESET_BUTTON_SIZE } from "./constants";
import { useCursorPaginationNav } from "./use-cursor-pagination-nav";

/**
 * Barre de pagination des listes ADMIN (la boutique a la sienne :
 * `StorefrontPaginationBand`). Registre outil : encre neutre, densité 32 px
 * sur pointeur fin — le survol, le focus-ring et leurs gates `can-hover:`
 * sont ceux du `<Button variant="outline">`, sans surcharge (audit
 * 2026-08-05 : l'ancienne couche rose/verre/zoom était le costume boutique
 * égaré dans l'outil, et son `backdrop-blur` ne floutait rien).
 */
function CursorPaginationInner({
	perPage: perPageProp,
	hasNextPage,
	hasPreviousPage,
	currentPageSize,
	nextCursor,
	prevCursor,
	perPageOptions = PER_PAGE_OPTIONS,
	focusTargetRef,
	totalCount,
	showCount = true,
	secondary = false,
}: CursorPaginationProps) {
	const perPageId = useId();
	// `useId`, pas un littéral : les listes admin montent DEUX instances (table
	// desktop + liste mobile) — un id fixe était dupliqué dans le DOM, et
	// l'instance secondaire décrivait des raccourcis qu'elle n'installe pas.
	const shortcutsId = useId();
	const haptic = useHaptic();
	const searchParams = useSearchParams();
	// P1-3 : annonce SR des raccourcis clavier (Alt+Flèche) uniquement quand le
	// device a un pointer fine (souris/trackpad). Sur tactile, les raccourcis
	// n'existent pas → bruit cognitif pour VoiceOver iOS.
	// ⚠️ `FINE_POINTER_QUERY`, pas `HOVER_CAPABLE_QUERY` : la question ici est
	// « les raccourcis ont-ils un sens ? », pas « puis-je révéler au survol ? ».
	const hasFinePointer = useMediaQuery(FINE_POINTER_QUERY);

	const { cursor, isPending, lastAction, goNext, goPrevious, reset, startNavigation } =
		useCursorPaginationNav({ nextCursor, prevCursor, prefetch: !secondary, focusTargetRef });

	// Sans `?perPage` en URL, on reflète la valeur réellement résolue côté serveur
	// (prop) plutôt qu'un défaut global codé en dur — sinon le select se désync du
	// nombre réellement chargé (ex. Clients=50, listes admin=20).
	const perPage = Number(searchParams.get("perPage")) || perPageProp || DEFAULT_PER_PAGE;

	const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
		if (isInteractiveTarget(e.target)) return;

		if (e.altKey && e.key === "ArrowLeft" && prevCursor) {
			e.preventDefault();
			goPrevious();
		}

		if (e.altKey && e.key === "ArrowRight" && nextCursor) {
			e.preventDefault();
			goNext();
		}
	});

	useEffect(() => {
		if (secondary) return;
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [secondary]);

	function handlePerPageChange(value: string) {
		const newPerPage = Number(value);
		if (newPerPage === perPage) return;
		haptic("selection");
		startNavigation("perPage", (params) => {
			params.set("perPage", String(newPerPage));
			params.delete("cursor");
			params.delete("direction");
		});
	}

	const isFirstPage = !cursor;
	const canNavigate = hasNextPage || hasPreviousPage;

	// Une seule page (ni précédent ni suivant) : rien à paginer → ne rien rendre
	// (décision UX). Placé après tous les hooks/effects pour respecter les règles
	// des hooks. Masque toute la barre (sélecteur « par page » + compteur + nav).
	if (!canNavigate) return null;

	// Affiche le total uniquement s'il dépasse la page courante (sinon redondant
	// avec le compteur "X résultats" déjà rendu — la liste tient sur une page).
	const showTotal = typeof totalCount === "number" && totalCount > currentPageSize;
	const pluralRef = totalCount ?? currentPageSize;

	// L'aide raccourcis n'appartient qu'à l'instance qui les INSTALLE : la
	// secondaire (liste mobile admin) saute le listener, elle ne doit donc ni la
	// rendre ni la référencer.
	const showShortcutsHint = !secondary && hasFinePointer;

	// Message pour les screen readers — une phrase concise. La position
	// (première/dernière) est déjà annoncée par le `<div role="status">`
	// ci-dessous, on évite le doublon.
	const ariaLiveMessage = isPending
		? "Chargement des résultats…"
		: currentPageSize === 0
			? "Aucun résultat."
			: showTotal
				? `Page chargée, ${currentPageSize} sur ${totalCount} résultat${totalCount > 1 ? "s" : ""}.`
				: `Page chargée, ${currentPageSize} résultat${currentPageSize > 1 ? "s" : ""}.`;

	return (
		<div
			className={cn(
				"flex flex-row items-center justify-center gap-2 sm:justify-between sm:gap-3",
				// Hors du conditionnel pour que le fondu joue aussi au RETOUR de
				// l'état chargement (dans le conditionnel, la classe disparaissait
				// avec `isPending` et l'opacité revenait d'un coup sec).
				"transition-opacity duration-200",
				isPending && "pointer-events-none opacity-80",
			)}
		>
			{/* Live region pour screen readers */}
			<div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
				{ariaLiveMessage}
			</div>
			{/* Informations sur la pagination — masquées sur mobile (le compteur est
			    déjà rendu au-dessus des listes), nav seule centrée < sm. */}
			<div className="hidden items-center gap-2 text-sm sm:flex sm:gap-3">
				<div className="flex items-center gap-1.5 sm:gap-2">
					<label htmlFor={perPageId} className="text-muted-foreground hidden text-xs sm:block">
						Par page
					</label>
					<Select value={String(perPage)} onValueChange={handlePerPageChange} disabled={isPending}>
						<SelectTrigger
							id={perPageId}
							className="h-11 w-20 sm:h-9 md:h-8"
							aria-label="Nombre de résultats par page"
						>
							<SelectValue>{perPage}</SelectValue>
						</SelectTrigger>
						<SelectContent>
							{perPageOptions.map((size) => (
								<SelectItem key={size} value={String(size)}>
									{size}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				{showCount && (
					<span className="text-muted-foreground text-sm">
						{currentPageSize > 0 ? (
							<>
								<span className="text-foreground font-medium">{currentPageSize}</span>
								{showTotal && (
									<>
										<span> sur </span>
										<span className="text-foreground font-medium">{totalCount}</span>
									</>
								)}
								<span className="hidden sm:inline"> résultat{pluralRef > 1 ? "s" : ""}</span>
							</>
						) : (
							<span className="hidden sm:inline">Aucun résultat</span>
						)}
					</span>
				)}
			</div>

			{/* Contrôles de pagination — `canNavigate` est toujours vrai ici
			    (early-return ci-dessus quand il n'y a qu'une page). */}
			<nav
				aria-label="Pagination"
				aria-describedby={showShortcutsHint ? shortcutsId : undefined}
				className="flex items-center gap-2"
			>
				{showShortcutsHint && (
					<span id={shortcutsId} className="sr-only">
						Raccourcis : Alt+Flèche gauche pour page précédente, Alt+Flèche droite pour page
						suivante
					</span>
				)}
				{/* Bouton retour au début - toujours affiché pour éviter layout shift */}
				<Button
					variant="outline"
					size="sm"
					disabled={isFirstPage || isPending}
					onClick={reset}
					className={cn(RESET_BUTTON_SIZE, "cursor-pointer gap-1 md:text-xs")}
					aria-label="Retour au début"
				>
					{isPending && lastAction === "reset" ? (
						<Spinner presentational className="size-5 md:size-4" />
					) : (
						<CaretDoubleLeftIcon className="size-5 md:size-4" />
					)}
					<span className="hidden sm:inline">Début</span>
				</Button>

				<ButtonGroup>
					{/* Bouton précédent */}
					<Button
						variant="outline"
						size="icon"
						disabled={!hasPreviousPage || isPending}
						onClick={goPrevious}
						className={cn(NAV_BUTTON_SIZE, "cursor-pointer")}
						aria-label="Page précédente"
					>
						{isPending && lastAction === "prev" ? (
							<Spinner presentational className="size-5 md:size-4" />
						) : (
							<CaretLeftIcon className="size-5 md:size-4" />
						)}
					</Button>

					<div
						className={cn(
							"bg-muted flex items-center justify-center px-3 text-center text-xs",
							PAGE_INDICATOR_SIZE,
						)}
						role="status"
						aria-label="Position actuelle dans la pagination"
					>
						<span className="text-foreground font-medium">
							{/* Pas de cas « Page unique » : ni précédent ni suivant, c'est
							    l'early-return `!canNavigate` plus haut — la branche était
							    inatteignable (audit 2026-08-05). */}
							{!hasPreviousPage ? "Première page" : !hasNextPage ? "Dernière page" : "Suite"}
						</span>
					</div>

					{/* Bouton suivant */}
					<Button
						variant="outline"
						size="icon"
						disabled={!hasNextPage || isPending}
						onClick={goNext}
						className={cn(NAV_BUTTON_SIZE, "cursor-pointer")}
						aria-label="Page suivante"
					>
						{isPending && lastAction === "next" ? (
							<Spinner presentational className="size-5 md:size-4" />
						) : (
							<CaretRightIcon className="size-5 md:size-4" />
						)}
					</Button>
				</ButtonGroup>

				{/* Les raccourcis, enfin visibles là où ils s'appliquent (pointeur
				    fin, instance primaire). Décoratif : l'annonce SR est portée par
				    le span sr-only ci-dessus. */}
				{showShortcutsHint && (
					<span aria-hidden="true" className="ml-1 hidden items-center gap-1 md:flex">
						<kbd className="text-muted-foreground border-border bg-card rounded-sm border px-1.5 py-0.5 font-mono text-[10px]">
							⌥←
						</kbd>
						<kbd className="text-muted-foreground border-border bg-card rounded-sm border px-1.5 py-0.5 font-mono text-[10px]">
							⌥→
						</kbd>
					</span>
				)}
			</nav>
		</div>
	);
}

export function CursorPagination(props: ComponentProps<typeof CursorPaginationInner>) {
	return (
		<Suspense fallback={null}>
			<CursorPaginationInner {...props} />
		</Suspense>
	);
}
