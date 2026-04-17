import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { cn } from "@/shared/utils/cn";
import { CHART_STYLES } from "../../constants/chart-styles";

interface ChartSkeletonProps {
	/** Hauteur du graphique en pixels (fallback fixe). Ignoré si `heightClassName` est fourni. */
	height?: number;
	/** Classe Tailwind responsive pour la hauteur (ex. "h-60 sm:h-[250px] md:h-75") — anti-CLS desktop/mobile */
	heightClassName?: string;
	/** Label pour l'accessibilite */
	ariaLabel?: string;
}

/**
 * Skeleton pour les graphiques.
 *
 * - `heightClassName` (préféré) : classes Tailwind responsives qui matchent la hauteur réelle
 *   du graphique sur chaque breakpoint, évitant tout CLS lors du remplacement par le contenu.
 * - `height` (legacy) : valeur fixe en pixels appliquée via style inline.
 */
export function ChartSkeleton({
	height = 250,
	heightClassName,
	ariaLabel = "Chargement du graphique",
}: ChartSkeletonProps) {
	const useResponsive = Boolean(heightClassName);

	return (
		<div role="status" aria-busy="true" aria-label={ariaLabel}>
			<Card className={CHART_STYLES.card}>
				<CardHeader>
					<Skeleton className="mb-1 h-6 w-48" /> {/* Titre */}
					<Skeleton className="h-4 w-64" /> {/* Description */}
				</CardHeader>
				<CardContent>
					{/* Simulation des axes du chart */}
					<div
						className={cn("relative", useResponsive && heightClassName)}
						style={useResponsive ? undefined : { height: `${height}px` }}
					>
						{/* Axe Y (gauche) */}
						<div className="absolute top-0 bottom-0 left-0 flex w-12 flex-col justify-between py-4">
							<Skeleton className="h-3 w-8" />
							<Skeleton className="h-3 w-10" />
							<Skeleton className="h-3 w-8" />
							<Skeleton className="h-3 w-10" />
						</div>
						{/* Zone du graphique */}
						<Skeleton className="absolute top-0 right-0 bottom-8 left-14 rounded" />
						{/* Axe X (bas) */}
						<div className="absolute right-0 bottom-0 left-14 flex justify-between">
							<Skeleton className="h-3 w-8" />
							<Skeleton className="h-3 w-8" />
							<Skeleton className="h-3 w-8" />
							<Skeleton className="h-3 w-8" />
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
