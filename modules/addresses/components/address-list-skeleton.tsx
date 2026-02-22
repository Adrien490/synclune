import { Skeleton, SkeletonGroup } from "@/shared/components/ui/skeleton";

/**
 * Skeleton pour la liste d'adresses
 * Reproduit exactement la structure de AddressList avec header + grille de cartes
 */
export function AddressListSkeleton() {
	return (
		<SkeletonGroup label="Chargement des adresses" className="space-y-6">
			{/* Section header skeleton */}
			<div className="flex items-center justify-between gap-4">
				<div className="space-y-2">
					<Skeleton className="h-7 w-48 bg-muted/50" />
					<Skeleton className="h-4 w-64 bg-muted/30" />
				</div>
				<Skeleton className="h-9 w-24 bg-muted/40" />
			</div>

			{/* Address cards grid skeleton */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{[...Array(3)].map((_, i) => (
					<div
						key={i}
						className="flex flex-col gap-3 p-4 rounded-lg border bg-card h-full"
					>
						{/* Header : Nom et Actions */}
						<div className="flex items-start justify-between gap-2">
							<div className="flex items-center gap-2 flex-1">
								<Skeleton className="h-5 w-32 bg-muted/50" />
							</div>
							<Skeleton className="h-8 w-8 rounded-md bg-muted/40" />
						</div>

						{/* Adresse complète */}
						<div className="space-y-2 flex-1">
							<Skeleton className="h-4 w-full bg-muted/40" />
							<Skeleton className="h-4 w-3/4 bg-muted/30" />
							<Skeleton className="h-4 w-2/3 bg-muted/30" />
						</div>

						{/* Téléphone */}
						<div className="flex items-center gap-1.5 pt-2 border-t border-border/50">
							<Skeleton className="h-3.5 w-3.5 rounded-full bg-muted/40" />
							<Skeleton className="h-4 w-36 bg-muted/40" />
						</div>
					</div>
				))}
			</div>
		</SkeletonGroup>
	);
}
