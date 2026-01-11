import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { CHART_STYLES } from "../../constants/chart-styles";

interface KpisSkeletonProps {
	/** Nombre de cartes KPI a afficher */
	count?: 2 | 3 | 4 | 6;
	/** Label pour l'accessibilite */
	ariaLabel?: string;
}

/**
 * Skeleton individuel pour une KPI Card
 * Reproduit exactement la structure de KpiCard pour eviter le CLS
 */
function KpiCardSkeleton() {
	return (
		<Card className={`${CHART_STYLES.card} min-h-35`}>
			{/* Header avec titre et icone */}
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<Skeleton className="h-4 w-24" /> {/* Titre */}
				<Skeleton className="h-8 w-8 rounded-full" /> {/* Icone */}
			</CardHeader>
			{/* Contenu avec valeur et evolution */}
			<CardContent>
				<Skeleton className="h-9 w-32 mb-2" /> {/* Valeur (text-3xl) */}
				<div className="flex items-center gap-2">
					<Skeleton className="h-4 w-12" /> {/* Evolution % */}
					<Skeleton className="h-5 w-16 rounded-full" /> {/* Badge optionnel */}
				</div>
			</CardContent>
		</Card>
	);
}

/**
 * Skeleton pour les grilles de cartes KPI
 * Reutilisable dans toutes les sections du dashboard
 */
export function KpisSkeleton({
	count = 4,
	ariaLabel = "Chargement des indicateurs",
}: KpisSkeletonProps) {
	const gridCols =
		count === 2
			? "lg:grid-cols-2"
			: count === 3 || count === 6
				? "lg:grid-cols-3"
				: "lg:grid-cols-4";

	return (
		<div
			role="status"
			aria-busy="true"
			aria-label={ariaLabel}
			className={`grid ${CHART_STYLES.spacing.kpiGap} md:grid-cols-2 ${gridCols}`}
		>
			{[...Array(count)].map((_, i) => (
				<KpiCardSkeleton key={i} />
			))}
		</div>
	);
}
