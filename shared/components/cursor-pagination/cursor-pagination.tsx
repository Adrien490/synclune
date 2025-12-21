"use client";

import { ButtonGroup } from "@/shared/components/ui/button-group";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/components/ui/select";
import { cn } from "@/shared/utils/cn";
import {
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	Loader2,
} from "lucide-react";
import type { RefObject } from "react";
import { Button } from "../ui/button";
import { PER_PAGE_OPTIONS } from "./pagination";
import { useCursorPagination } from "@/shared/hooks/use-cursor-pagination";

export interface CursorPaginationProps {
	perPage: number;
	hasNextPage: boolean;
	hasPreviousPage: boolean;
	currentPageSize: number;
	nextCursor: string | null;
	prevCursor: string | null;
	/** Options personnalisées pour le nombre d'éléments par page */
	perPageOptions?: readonly number[] | number[];
	/**
	 * Ref vers l'élément qui doit recevoir le focus après navigation
	 * Améliore l'accessibilité clavier en ramenant le focus au bon endroit
	 */
	focusTargetRef?: RefObject<HTMLElement | null>;
}

export function CursorPagination({
	perPage,
	hasNextPage,
	hasPreviousPage,
	currentPageSize,
	nextCursor,
	prevCursor,
	perPageOptions = PER_PAGE_OPTIONS,
	focusTargetRef,
}: CursorPaginationProps) {
	const {
		cursor,
		isPending,
		handleNext,
		handlePrevious,
		handleReset,
		handlePerPageChange,
	} = useCursorPagination({ nextCursor, prevCursor, focusTargetRef });

	const isFirstPage = !cursor;
	const canNavigate = hasNextPage || hasPreviousPage;

	// Message pour les screen readers
	const ariaLiveMessage = (() => {
		if (isPending) return "Chargement des résultats...";
		if (currentPageSize === 0) return "Aucun résultat trouvé.";

		const parts = [
			`Affichage de ${currentPageSize} résultat${currentPageSize > 1 ? "s" : ""} sur cette page.`,
		];

		if (!hasPreviousPage) {
			parts.push("Première page.");
		} else {
			parts.push("Page précédente disponible.");
		}

		if (hasNextPage) {
			parts.push("Pages suivantes disponibles.");
		} else {
			parts.push("Dernière page.");
		}

		return parts.join(" ");
	})();

	return (
		<div
			className={cn(
				"flex flex-row items-center justify-between gap-2 sm:gap-3",
				// Opacity réduite pendant le chargement avec transition smooth pour UX fluide
				// opacity-80 (au lieu de 70) pour meilleur contraste WCAG AA (4.5:1)
				isPending &&
					"opacity-80 pointer-events-none transition-opacity duration-200"
			)}
		>
			{/* Live region pour screen readers */}
			<div
				role="status"
				aria-live="polite"
				aria-atomic="true"
				className="sr-only"
			>
				{ariaLiveMessage}
			</div>
			{/* Informations sur la pagination */}
			<div className="flex items-center gap-2 sm:gap-3 text-sm">
				<div className="flex items-center gap-1.5 sm:gap-2">
					<label
						htmlFor="perPage-select"
						className="hidden sm:block text-xs text-muted-foreground"
					>
						Par page
					</label>
					<Select
						value={String(perPage)}
						onValueChange={(value) => handlePerPageChange(Number(value))}
						disabled={isPending}
					>
						<SelectTrigger
							id="perPage-select"
							className="w-16 sm:w-20 h-9"
							aria-label="Éléments par page"
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

				<span className="text-sm text-muted-foreground">
					{currentPageSize > 0 ? (
						<>
							<span className="font-medium text-foreground">
								{currentPageSize}
							</span>
							<span className="hidden sm:inline">
								{" "}résultat{currentPageSize > 1 ? "s" : ""}
							</span>
						</>
					) : (
						<span className="hidden sm:inline">Aucun résultat</span>
					)}
				</span>
			</div>

			{/* Contrôles de pagination */}
			{canNavigate && (
				<nav
					role="navigation"
					aria-label="Pagination"
					className="flex items-center gap-2"
				>
					{/* Bouton retour au début - toujours affiché pour éviter layout shift */}
					<Button
						variant="outline"
						size="sm"
						disabled={isFirstPage || isPending}
						onClick={handleReset}
						className={cn(
							"h-12 md:h-9 gap-1 cursor-pointer",
							"backdrop-blur-sm",
							"border-primary/20",
							"hover:bg-primary/10 hover:text-primary hover:border-primary/40",
							"motion-safe:hover:scale-[1.02]",
							"focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
							"motion-safe:active:scale-[0.98]",
							"motion-safe:transition-all motion-safe:duration-300 motion-reduce:transition-none"
						)}
						aria-label="Retour au début"
					>
						{isPending && !isFirstPage ? (
							<Loader2 className="size-5 md:size-4 animate-spin" />
						) : (
							<ChevronsLeft className="size-5 md:size-4" />
						)}
						<span className="hidden sm:inline">Début</span>
					</Button>

					<ButtonGroup>
						{/* Bouton précédent */}
						<Button
							variant="outline"
							size="icon"
							disabled={!hasPreviousPage || isPending}
							onClick={handlePrevious}
							className={cn(
								"h-12 w-12 md:h-9 md:w-9 cursor-pointer",
								"backdrop-blur-sm",
								"border-primary/20",
								"hover:bg-primary/10 hover:text-primary hover:border-primary/40",
								"motion-safe:hover:scale-[1.02]",
								"focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
								"motion-safe:active:scale-[0.98]",
								"motion-safe:transition-all motion-safe:duration-300 motion-reduce:transition-none"
							)}
							aria-label="Page précédente"
						>
							<ChevronLeft className="size-5 md:size-4" />
						</Button>

						<div
							role="status"
							aria-current="page"
							className="px-3 text-xs sm:text-sm bg-muted/50 min-w-[80px] sm:min-w-[100px] text-center flex items-center justify-center h-12 md:h-9"
						>
							<span className="font-medium text-foreground">
								{!hasPreviousPage && !hasNextPage
									? "Page unique"
									: !hasPreviousPage
										? "Page 1"
										: !hasNextPage
											? "Dernière page"
											: "Page 2+"}
							</span>
						</div>

						{/* Bouton suivant */}
						<Button
							variant="outline"
							size="icon"
							disabled={!hasNextPage || isPending}
							onClick={handleNext}
							className={cn(
								"h-12 w-12 md:h-9 md:w-9 cursor-pointer",
								"backdrop-blur-sm",
								"border-primary/20",
								"hover:bg-primary/10 hover:text-primary hover:border-primary/40",
								"motion-safe:hover:scale-[1.02]",
								"focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
								"motion-safe:active:scale-[0.98]",
								"motion-safe:transition-all motion-safe:duration-300 motion-reduce:transition-none"
							)}
							aria-label="Page suivante"
						>
							<ChevronRight className="size-5 md:size-4" />
						</Button>
					</ButtonGroup>
				</nav>
			)}
		</div>
	);
}

// Re-export pagination utilities for convenience
export {
	DEFAULT_PER_PAGE,
	DEFAULT_DIRECTION,
	buildCursorPagination,
	processCursorResults,
} from "./pagination";
export type {
	CursorPaginationParams,
	PaginationInfo,
	CursorPaginationResult,
} from "./pagination";
