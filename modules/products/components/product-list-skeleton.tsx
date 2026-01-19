import { CursorPaginationSkeleton } from "@/shared/components/cursor-pagination";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { cn } from "@/shared/utils/cn";

export function ProductListSkeleton() {
	return (
		<div className="space-y-6">
			{/* Compteur de résultats */}
			<div className="flex items-center justify-between">
				<Skeleton className="h-5 w-24 rounded" />
			</div>

			{/* Grille des produits */}
			<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
				{Array.from({ length: 8 }).map((_, i) => (
					<div
						key={i}
						className="product-item"
						style={{
							// Delai d'animation echelonne pour effet de vague
							animationDelay: `${i * 100}ms`,
						}}
					>
						<article
							className={cn(
								"product-card grid relative overflow-hidden rounded-lg",
								"bg-card border-2 border-transparent shadow-sm",
								// Animation d'entree echelonnee
								"motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-4",
								"motion-safe:duration-300"
							)}
							style={{ animationDelay: `${i * 50}ms`, animationFillMode: "backwards" }}
						>
							{/* Image avec aspect-4/5 ratio */}
							<div className="product-card-media relative aspect-square sm:aspect-4/5 overflow-hidden bg-muted rounded-lg">
								<Skeleton className="absolute inset-0 rounded-lg" />
							</div>

							{/* Contenu */}
							<div className="flex flex-col gap-2.5 sm:gap-3 relative p-3 sm:p-4 lg:p-5">
								{/* Titre - line-clamp-1 sm:line-clamp-2 */}
								<Skeleton className="h-5 sm:h-6 w-4/5 rounded" />

								{/* Texte "X couleurs disponibles" */}
								<Skeleton className="h-4 w-2/5 rounded" />

								{/* Prix */}
								<Skeleton className="h-6 w-1/3 rounded" />

								{/* Bouton mobile */}
								<Skeleton className="h-10 w-full rounded-md sm:hidden" />
							</div>
						</article>
					</div>
				))}
			</div>

			{/* Pagination */}
			<div className="flex justify-end mt-8 lg:mt-12">
				<CursorPaginationSkeleton />
			</div>
		</div>
	);
}
