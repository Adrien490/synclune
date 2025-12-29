import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { CHART_STYLES } from "../../constants/chart-styles";

interface ListSkeletonProps {
	/** Nombre d'elements dans la liste */
	itemCount?: number;
	/** Label pour l'accessibilite */
	ariaLabel?: string;
}

/**
 * Skeleton pour les listes (commandes recentes, alertes stock, etc.)
 */
export function ListSkeleton({
	itemCount = 5,
	ariaLabel = "Chargement de la liste",
}: ListSkeletonProps) {
	return (
		<div role="status" aria-busy="true" aria-label={ariaLabel}>
			<Card className={CHART_STYLES.card}>
				<CardHeader>
					<Skeleton className="h-6 w-48 mb-1" /> {/* Titre */}
					<Skeleton className="h-4 w-64" /> {/* Description */}
				</CardHeader>
				<CardContent>
					<div className="space-y-3">
						{[...Array(itemCount)].map((_, i) => (
							<div
								key={i}
								className="flex items-center justify-between p-3 rounded-lg border"
							>
								<div className="flex items-center gap-3 flex-1">
									<Skeleton className="h-5 w-5 rounded" /> {/* Icone */}
									<div className="space-y-1 flex-1">
										<Skeleton className="h-4 w-32" /> {/* Titre produit */}
										<Skeleton className="h-3 w-24" /> {/* Sous-titre */}
									</div>
								</div>
								<div className="flex items-center gap-2">
									<Skeleton className="h-5 w-16 rounded-full" /> {/* Badge */}
									<Skeleton className="h-4 w-8" /> {/* Valeur */}
								</div>
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
