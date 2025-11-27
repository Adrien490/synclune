import { Skeleton } from "@/shared/components/ui/skeleton";

export function CursorPaginationSkeleton() {
	return (
		<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
			{/* Informations sur la pagination */}
			<div className="flex items-center gap-3 text-sm">
				<div className="flex items-center gap-2">
					<Skeleton className="h-3 w-14" />
					<Skeleton className="h-9 w-[70px] sm:w-[80px]" />
				</div>
				<Skeleton className="h-4 w-24" />
			</div>

			{/* Contrôles de pagination */}
			<div className="flex items-center gap-2">
				{/* Bouton retour au début */}
				<Skeleton className="h-9 w-20 max-sm:w-11" />

				{/* Groupe de boutons */}
				<div className="flex items-center">
					{/* Bouton précédent */}
					<Skeleton className="h-9 w-9 max-sm:h-11 max-sm:w-11 rounded-r-none" />

					{/* Indicateur de page */}
					<Skeleton className="h-9 min-w-[80px] sm:min-w-[100px] rounded-none" />

					{/* Bouton suivant */}
					<Skeleton className="h-9 w-9 max-sm:h-11 max-sm:w-11 rounded-l-none" />
				</div>
			</div>
		</div>
	);
}
