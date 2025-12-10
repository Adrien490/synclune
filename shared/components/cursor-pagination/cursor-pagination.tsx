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
}

export function CursorPagination({
	perPage,
	hasNextPage,
	hasPreviousPage,
	currentPageSize,
	nextCursor,
	prevCursor,
	perPageOptions = PER_PAGE_OPTIONS,
}: CursorPaginationProps) {
	const {
		cursor,
		isPending,
		handleNext,
		handlePrevious,
		handleReset,
		handlePerPageChange,
	} = useCursorPagination({ nextCursor, prevCursor });

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
				"flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3",
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
			<div className="flex items-center gap-3 text-sm">
				<div className="flex items-center gap-2">
					<label
						htmlFor="perPage-select"
						className="text-xs text-muted-foreground"
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
							className="w-[70px] sm:w-[80px] h-9"
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
							</span>{" "}
							résultat{currentPageSize > 1 ? "s" : ""}
						</>
					) : (
						"Aucun résultat"
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
							"h-11 md:h-9 gap-1",
							"backdrop-blur-sm",
							"border-primary/20",
							"hover:bg-primary/10 hover:text-primary hover:border-primary/40",
							"hover:scale-[1.02]",
							"focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2",
							"active:scale-[0.98]",
							"transition-all duration-300"
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
								"h-11 w-11 md:h-9 md:w-9",
								"backdrop-blur-sm",
								"border-primary/20",
								"hover:bg-primary/10 hover:text-primary hover:border-primary/40",
								"hover:scale-[1.02]",
								"focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2",
								"active:scale-[0.98]",
								"transition-all duration-300"
							)}
							aria-label="Page précédente"
						>
							<ChevronLeft className="size-5 md:size-4" />
						</Button>

						<div
							role="status"
							aria-current="page"
							className="px-3 text-xs sm:text-sm bg-muted/50 min-w-[80px] sm:min-w-[100px] text-center flex items-center justify-center h-11 md:h-9"
						>
							<span className="font-medium text-foreground">
								{!hasPreviousPage && !hasNextPage
									? "Page unique"
									: !hasPreviousPage
										? "Page 1"
										: !hasNextPage
											? "Dernière"
											: "En cours"}
							</span>
						</div>

						{/* Bouton suivant */}
						<Button
							variant="outline"
							size="icon"
							disabled={!hasNextPage || isPending}
							onClick={handleNext}
							className={cn(
								"h-11 w-11 md:h-9 md:w-9",
								"backdrop-blur-sm",
								"border-primary/20",
								"hover:bg-primary/10 hover:text-primary hover:border-primary/40",
								"hover:scale-[1.02]",
								"focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2",
								"active:scale-[0.98]",
								"transition-all duration-300"
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
