import { Card, CardContent } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";

interface KpisSkeletonProps {
	/** Nombre de cartes KPI a afficher */
	count?: 4 | 6;
	/** Label pour l'accessibilite */
	ariaLabel?: string;
}

/**
 * Skeleton pour les cartes KPI
 * Reutilisable dans toutes les sections du dashboard
 */
export function KpisSkeleton({
	count = 4,
	ariaLabel = "Chargement des indicateurs",
}: KpisSkeletonProps) {
	const gridCols = count === 6 ? "lg:grid-cols-3" : "lg:grid-cols-4";

	return (
		<div
			role="status"
			aria-busy="true"
			aria-label={ariaLabel}
			className={`grid gap-4 md:grid-cols-2 ${gridCols}`}
		>
			{[...Array(count)].map((_, i) => (
				<Card key={i} className="border-l-4 border-primary/40">
					<CardContent className="p-6">
						<Skeleton className="h-4 w-24 mb-2" />
						<Skeleton className="h-8 w-32 mb-2" />
						<Skeleton className="h-3 w-16" />
					</CardContent>
				</Card>
			))}
		</div>
	);
}

interface ChartSkeletonProps {
	/** Hauteur du graphique */
	height?: number;
	/** Label pour l'accessibilite */
	ariaLabel?: string;
}

/**
 * Skeleton pour les graphiques
 */
export function ChartSkeleton({
	height = 250,
	ariaLabel = "Chargement du graphique",
}: ChartSkeletonProps) {
	return (
		<div role="status" aria-busy="true" aria-label={ariaLabel}>
			<Card className="border-l-4 border-primary/30">
				<CardContent className="p-6">
					<Skeleton className="h-6 w-48 mb-2" />
					<Skeleton className="h-4 w-64 mb-4" />
					<Skeleton className={`h-[${height}px] w-full`} />
				</CardContent>
			</Card>
		</div>
	);
}

interface ListSkeletonProps {
	/** Nombre d'elements dans la liste */
	itemCount?: number;
	/** Label pour l'accessibilite */
	ariaLabel?: string;
}

/**
 * Skeleton pour les listes
 */
export function ListSkeleton({
	itemCount = 5,
	ariaLabel = "Chargement de la liste",
}: ListSkeletonProps) {
	return (
		<div role="status" aria-busy="true" aria-label={ariaLabel}>
			<Card className="border-l-4 border-primary/30">
				<CardContent className="p-6">
					<Skeleton className="h-6 w-48 mb-4" />
					{[...Array(itemCount)].map((_, i) => (
						<div key={i} className="flex items-center gap-4 py-3">
							<Skeleton className="h-4 w-1/3" />
							<Skeleton className="h-4 w-1/4" />
							<Skeleton className="h-4 w-1/4" />
						</div>
					))}
				</CardContent>
			</Card>
		</div>
	);
}
