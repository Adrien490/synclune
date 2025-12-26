import { Skeleton } from "@/shared/components/ui/skeleton";

export function CursorPaginationSkeleton() {
	return (
		<div
			role="status"
			aria-label="Chargement de la pagination"
			className="flex flex-row items-center justify-between gap-2 sm:gap-3"
		>
			{/* Informations sur la pagination */}
			<div className="flex items-center gap-2 sm:gap-3 text-sm">
				<div className="flex items-center gap-1.5 sm:gap-2">
					<Skeleton className="hidden sm:block h-3 w-14" />
					<Skeleton className="h-9 w-16 sm:w-20" />
				</div>
				<Skeleton className="h-4 w-8 sm:w-24" />
			</div>

			{/* Contrôles de pagination */}
			<div className="flex items-center gap-2">
				{/* Bouton retour au début */}
				<Skeleton className="h-12 w-12 md:h-9 md:w-20" />

				{/* Groupe de boutons */}
				<div className="flex items-center">
					{/* Bouton précédent */}
					<Skeleton className="h-12 w-12 md:h-9 md:w-9 rounded-r-none" />

					{/* Indicateur de page */}
					<Skeleton className="h-12 md:h-9 min-w-[80px] sm:min-w-[100px] rounded-none" />

					{/* Bouton suivant */}
					<Skeleton className="h-12 w-12 md:h-9 md:w-9 rounded-l-none" />
				</div>
			</div>
		</div>
	);
}
