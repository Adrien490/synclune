import { cn } from "@/shared/utils/cn";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { CHART_STYLES } from "../../constants/chart-styles";

interface KpisSkeletonProps {
	/** Nombre de cartes KPI featured (Row 1) */
	count?: 2 | 3 | 4 | 6;
	/** Nombre de cartes KPI compactes (Row 2) */
	compactCount?: number;
	/** Label pour l'accessibilite */
	ariaLabel?: string;
}

/**
 * Skeleton individuel pour une KPI Card
 * Reproduit exactement la structure de KpiCard pour eviter le CLS
 */
export function KpiCardSkeleton() {
	return (
		<Card className={cn(CHART_STYLES.card, "min-h-35")}>
			{/* Header avec titre et icone */}
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<Skeleton className="h-4 w-24" /> {/* Titre */}
				<Skeleton className="h-8 w-8 rounded-full" /> {/* Icone */}
			</CardHeader>
			{/* Contenu avec valeur et evolution */}
			<CardContent>
				<Skeleton className="mb-2 h-9 w-32" /> {/* Valeur (text-3xl) */}
				<div className="flex items-center gap-2">
					<Skeleton className="h-4 w-12" /> {/* Evolution % */}
					<Skeleton className="h-5 w-16 rounded-full" /> {/* Badge optionnel */}
				</div>
			</CardContent>
		</Card>
	);
}

/**
 * Skeleton compact pour les KPI cards de Row 2
 */
function KpiCardCompactSkeleton() {
	return (
		<Card className={CHART_STYLES.card}>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<Skeleton className="h-4 w-28" />
				<Skeleton className="h-6 w-6 rounded-full" />
			</CardHeader>
			<CardContent>
				<Skeleton className="mb-1 h-7 w-20" />
				<Skeleton className="h-3 w-16" />
			</CardContent>
		</Card>
	);
}

/**
 * Skeleton pour les grilles de cartes KPI
 * Row 1: featured cards (large), Row 2: compact cards (optional)
 */
export function KpisSkeleton({
	count = 4,
	compactCount = 0,
	ariaLabel = "Chargement des indicateurs",
}: KpisSkeletonProps) {
	const gridCols =
		count === 2
			? "lg:grid-cols-2"
			: count === 3 || count === 6
				? "lg:grid-cols-3"
				: "lg:grid-cols-4";

	return (
		<div role="status" aria-busy="true" aria-label={ariaLabel} className="space-y-4">
			{/* Row 1: Featured KPIs */}
			<div className={cn("grid", CHART_STYLES.spacing.kpiGap, "sm:grid-cols-2", gridCols)}>
				{Array.from({ length: count }).map((_, i) => (
					<KpiCardSkeleton key={i} />
				))}
			</div>

			{/* Row 2: Compact KPIs */}
			{compactCount > 0 && (
				<div className={cn("grid", CHART_STYLES.spacing.kpiGap, "sm:grid-cols-3")}>
					{Array.from({ length: compactCount }).map((_, i) => (
						<KpiCardCompactSkeleton key={i} />
					))}
				</div>
			)}
		</div>
	);
}
