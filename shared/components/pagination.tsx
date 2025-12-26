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
	ChevronsRight,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { usePagination } from "@/shared/hooks/use-pagination";
import { getPaginationItems } from "@/shared/utils/get-pagination-items";

export interface PaginationProps {
	total: number;
	pageCount: number;
	page: number;
	perPage: number;
}

export function Pagination({
	total,
	pageCount,
	page,
	perPage,
}: PaginationProps) {
	const { isPending, handlePageChange, handlePerPageChange } = usePagination();

	// Calculer la plage visible avec les props reçues (plus fiable)
	const start = total === 0 ? 0 : (page - 1) * perPage + 1;
	const end = Math.min(page * perPage, total);

	// Version ultra-simplifiée pour afficher seulement les pages utiles

	const paginationItems = getPaginationItems(pageCount, page);

	return (
		<div
			className={cn(
				"flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3",
				isPending && "opacity-70"
			)}
		>
			{/* Informations sur la pagination */}
			<div className="flex items-center gap-3 text-sm">
				<div className="flex items-center gap-2">
					<Select
						value={String(perPage)}
						onValueChange={(value) => handlePerPageChange(Number(value))}
						disabled={isPending}
					>
						<SelectTrigger className="w-[70px] h-9">
							<SelectValue>{perPage}</SelectValue>
						</SelectTrigger>
						<SelectContent>
							{[20, 50, 100, 200].map((size) => (
								<SelectItem key={size} value={String(size)}>
									{size}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<span className="text-xs text-muted-foreground hidden sm:inline">
						par page
					</span>
				</div>

				<span className="text-sm text-muted-foreground">
					{total > 0 ? (
						<>
							<span className="font-medium text-foreground">
								{start}-{end}
							</span>{" "}
							sur <span className="font-medium text-foreground">{total}</span>
						</>
					) : (
						"Aucun résultat"
					)}
				</span>
			</div>

			{/* Contrôles de pagination */}
			<nav
				role="navigation"
				aria-label="Pagination"
				className="flex items-center"
			>
				<ButtonGroup>
					{/* Bouton première page */}
					<Button
						variant="outline"
						size="icon"
						disabled={page <= 1 || pageCount <= 1 || isPending}
						onClick={() => handlePageChange(1)}
						className={cn(
							"size-11",
							"backdrop-blur-sm",
							"border-primary/20",
							"hover:bg-primary/10 hover:text-primary hover:border-primary/40",
							"hover:scale-[1.02]",
							"transition-all duration-300",
							page === 1 && "bg-primary/10 text-primary"
						)}
						aria-label="Première page"
					>
						<ChevronsLeft className="size-5 md:size-4" />
					</Button>

					{/* Bouton précédent */}
					<Button
						variant="outline"
						size="icon"
						disabled={page <= 1 || pageCount <= 1 || isPending}
						onClick={() => handlePageChange(page - 1)}
						className={cn(
							"size-11",
							"backdrop-blur-sm",
							"border-primary/20",
							"hover:bg-primary/10 hover:text-primary hover:border-primary/40",
							"hover:scale-[1.02]",
							"transition-all duration-300"
						)}
						aria-label="Page précédente"
					>
						<ChevronLeft className="size-5 md:size-4" />
					</Button>

					{/* Affichage de page X/Y au lieu des numéros sur mobile */}
					<div className="inline sm:hidden px-2 text-sm bg-background/50 rounded-md">
						<span className="font-medium">{page}</span>
						<span className="text-muted-foreground mx-1">/</span>
						<span>{pageCount}</span>
					</div>

					{/* Pages et points de suspension pour desktop */}
					<div className="hidden sm:flex items-center">
						{paginationItems.map((item) =>
							item.type === "dots" ? (
								<div
									key={item.id}
									className="flex items-center justify-center size-11 mx-0.5 text-sm text-muted-foreground"
									aria-hidden="true"
								>
									{item.value}
								</div>
							) : (
								<Button
									key={`page-${item.value}`}
									variant={page === item.value ? "default" : "outline"}
									size="icon"
									disabled={isPending || pageCount <= 1}
									onClick={() => handlePageChange(item.value as number)}
									className={cn(
										"size-11",
										"backdrop-blur-sm",
										page !== item.value && "border-primary/20",
										"hover:scale-[1.02]",
										"transition-all duration-300",
										isPending && "text-muted-foreground",
										page === item.value && "font-semibold"
									)}
									aria-label={`Page ${item.value}`}
									aria-current={page === item.value ? "page" : undefined}
								>
									{item.value}
								</Button>
							)
						)}
					</div>

					{/* Bouton suivant */}
					<Button
						variant="outline"
						size="icon"
						disabled={page >= pageCount || pageCount <= 1 || isPending}
						onClick={() => handlePageChange(page + 1)}
						className={cn(
							"size-11",
							"backdrop-blur-sm",
							"border-primary/20",
							"hover:bg-primary/10 hover:text-primary hover:border-primary/40",
							"hover:scale-[1.02]",
							"transition-all duration-300"
						)}
						aria-label="Page suivante"
					>
						<ChevronRight className="size-5 md:size-4" />
					</Button>

					{/* Bouton dernière page */}
					<Button
						variant="outline"
						size="icon"
						disabled={page >= pageCount || pageCount <= 1 || isPending}
						onClick={() => handlePageChange(pageCount)}
						className={cn(
							"size-11",
							"backdrop-blur-sm",
							"border-primary/20",
							"hover:bg-primary/10 hover:text-primary hover:border-primary/40",
							"hover:scale-[1.02]",
							"transition-all duration-300",
							page === pageCount && "bg-primary/10 text-primary"
						)}
						aria-label="Dernière page"
					>
						<ChevronsRight className="size-5 md:size-4" />
					</Button>
				</ButtonGroup>
			</nav>
		</div>
	);
}
