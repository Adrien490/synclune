import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Skeleton pour la liste des articles du panier
 * Structure en 3 colonnes : Produit | Quantité | Total
 * Compatible Next.js 16 + React 19.2
 */
export function CartItemsListSkeleton() {
	return (
		<div className="space-y-4">
			{/* Skeleton items */}
			{Array.from({ length: 3 }).map((_, i) => (
				<div
					key={i}
					className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-4 md:gap-6 p-4 border rounded-xl border-border"
				>
					{/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
					    COLONNE 1 : PRODUIT (Image + Informations)
					    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
					<div className="flex gap-4">
						{/* Image skeleton */}
						<div className="relative w-24 h-24 shrink-0 rounded-md overflow-hidden">
							<Skeleton className="absolute inset-0" />
						</div>

						{/* Informations du produit */}
						<div className="flex-1 min-w-0 space-y-2">
							{/* Nom du produit */}
							<Skeleton className="h-5 w-3/4" />

							{/* Prix unitaire */}
							<div className="flex items-baseline gap-2">
								<Skeleton className="h-3 w-20" />
								<Skeleton className="h-4 w-16" />
							</div>

							{/* Attributs */}
							<Skeleton className="h-4 w-48" />

							{/* Badges */}
							<div className="flex gap-1.5">
								<Skeleton className="h-5 w-16 rounded-full" />
							</div>
						</div>
					</div>

					{/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
					    COLONNE 2 : QUANTITÉ (Contrôles + Supprimer)
					    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
					<div className="flex md:flex-col items-center justify-between md:justify-center gap-3 md:gap-2">
						{/* Contrôles de quantité (ButtonGroup style) */}
						<div className="flex items-center">
							<Skeleton className="h-10 w-10 rounded-l-md" />
							<Skeleton className="h-10 w-12" />
							<Skeleton className="h-10 w-10 rounded-r-md" />
						</div>

						{/* Lien supprimer */}
						<Skeleton className="h-4 w-16" />
					</div>

					{/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
					    COLONNE 3 : TOTAL
					    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
					<div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-1">
						<span className="text-xs text-muted-foreground md:hidden">Total</span>
						<Skeleton className="h-6 w-20" />
					</div>
				</div>
			))}
		</div>
	);
}
