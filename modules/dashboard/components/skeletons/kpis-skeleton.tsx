import { cn } from "@/shared/utils/cn";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { CHART_STYLES } from "../../constants/chart-styles";

interface KpisSkeletonProps {
	/** Nombre de cartes KPI featured (Row 1) — passer 0 pour ne rendre que la ligne compacte */
	count?: 0 | 2 | 3 | 4 | 6;
	/** Nombre de cartes KPI compactes (Row 2) */
	compactCount?: number;
	/** Label pour l'accessibilite */
	ariaLabel?: string;
}

/**
 * Skeleton individuel pour une KPI Card featured
 * Reproduit exactement la structure de KpiCard featured pour eviter le CLS
 */
export function KpiCardSkeleton() {
	return (
		<div className="min-w-[72vw] shrink-0 snap-start sm:min-w-0 sm:shrink">
			<Card className={cn(CHART_STYLES.card, "min-h-45")}>
				<CardHeader className="flex flex-row items-center justify-between pb-2">
					<Skeleton className="h-4 w-24" />
					<Skeleton className="size-10 rounded-full" />
				</CardHeader>
				<CardContent>
					<Skeleton className="mb-2 h-10 w-36" />
					<div className="flex items-center gap-2">
						<Skeleton className="h-4 w-12" />
						<Skeleton className="h-5 w-16 rounded-full" />
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

/**
 * Skeleton compact pour les KPI cards de Row 2
 * `min-h-25` matche la hauteur réelle de KpiCard size="compact" (anti-CLS)
 */
function KpiCardCompactSkeleton() {
	return (
		<Card className={cn(CHART_STYLES.card, "min-h-25")}>
			<CardHeader className="flex flex-row items-center justify-between pb-2">
				<Skeleton className="h-4 w-28" />
				<Skeleton className="size-6 rounded-full" />
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
 * Row 1: featured cards (horizontal scroll on mobile, grid on sm+)
 * Row 2: compact cards (2-col on mobile, 4-col on lg+)
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

	const compactGridCols = compactCount === 3 ? "sm:grid-cols-3" : "grid-cols-2 lg:grid-cols-4";

	return (
		<div role="status" aria-busy="true" aria-label={ariaLabel} className="space-y-4">
			{/* Row 1: Featured KPIs — horizontal scroll on mobile */}
			{count > 0 && (
				<div
					className={cn(
						"scrollbar-none flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2",
						"sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0",
						gridCols,
					)}
				>
					{Array.from({ length: count }).map((_, i) => (
						<KpiCardSkeleton key={i} />
					))}
				</div>
			)}

			{/* Row 2: Compact KPIs */}
			{compactCount > 0 && (
				<div className={cn("grid", compactGridCols, CHART_STYLES.spacing.kpiGap)}>
					{Array.from({ length: compactCount }).map((_, i) => (
						<KpiCardCompactSkeleton key={i} />
					))}
				</div>
			)}
		</div>
	);
}
