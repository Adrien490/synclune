import { Skeleton } from "@/shared/components/ui/skeleton";
import {
	NAV_BUTTON_SIZE,
	PAGE_INDICATOR_SIZE,
	RESET_BUTTON_SIZE,
} from "./constants";

export function CursorPaginationSkeleton({
	showNavigation = true,
}: {
	/** Whether to show navigation button skeletons. Set to false when the dataset is known to fit on one page. */
	showNavigation?: boolean;
} = {}) {
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

			{/* Contrôles de pagination — conditionally shown to match CursorPagination's canNavigate */}
			{showNavigation && (
				<div className="flex items-center gap-2">
					{/* Bouton retour au début */}
					<Skeleton className={RESET_BUTTON_SIZE} />

					{/* Groupe de boutons */}
					<div className="flex items-center">
						{/* Bouton précédent */}
						<Skeleton className={`${NAV_BUTTON_SIZE} rounded-r-none`} />

						{/* Indicateur de page */}
						<Skeleton className={`${PAGE_INDICATOR_SIZE} rounded-none`} />

						{/* Bouton suivant */}
						<Skeleton className={`${NAV_BUTTON_SIZE} rounded-l-none`} />
					</div>
				</div>
			)}
		</div>
	);
}
