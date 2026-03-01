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
					<Skeleton className="bg-muted/50 h-7 w-48" />
					<Skeleton className="bg-muted/30 h-4 w-64" />
				</div>
				<Skeleton className="bg-muted/40 h-9 w-24" />
			</div>

			{/* Address cards grid skeleton */}
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
				{[...Array(3)].map((_, i) => (
					<div key={i} className="bg-card flex h-full flex-col gap-3 rounded-lg border p-4">
						{/* Header : Nom et Actions */}
						<div className="flex items-start justify-between gap-2">
							<div className="flex flex-1 items-center gap-2">
								<Skeleton className="bg-muted/50 h-5 w-32" />
							</div>
							<Skeleton className="bg-muted/40 h-8 w-8 rounded-md" />
						</div>

						{/* Adresse complète */}
						<div className="flex-1 space-y-2">
							<Skeleton className="bg-muted/40 h-4 w-full" />
							<Skeleton className="bg-muted/30 h-4 w-3/4" />
							<Skeleton className="bg-muted/30 h-4 w-2/3" />
						</div>

						{/* Téléphone */}
						<div className="border-border/50 flex items-center gap-1.5 border-t pt-2">
							<Skeleton className="bg-muted/40 h-3.5 w-3.5 rounded-full" />
							<Skeleton className="bg-muted/40 h-4 w-36" />
						</div>
					</div>
				))}
			</div>
		</SkeletonGroup>
	);
}
