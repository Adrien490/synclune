import { CursorPaginationSkeleton } from "@/shared/components/cursor-pagination";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { cn } from "@/shared/utils/cn";

export function WishlistGridSkeleton() {
	return (
		<div className="space-y-8">
			{/* Header placeholder (count + clear button) */}
			<div className="flex items-center justify-between">
				<Skeleton className="h-5 w-20 rounded" />
				<Skeleton className="h-8 w-32 rounded" />
			</div>

			{/* Product grid matching ProductCard structure */}
			<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
				{Array.from({ length: 8 }).map((_, i) => (
					<article
						key={i}
						className={cn(
							"product-card grid relative overflow-hidden rounded-lg gap-4",
							"bg-card border-2 border-transparent shadow-sm",
							"motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-4",
							"motion-safe:duration-300"
						)}
						style={{ animationDelay: `${i * 50}ms`, animationFillMode: "backwards" }}
					>
						{/* Image with aspect ratio matching ProductCard */}
						<div className="product-card-media relative aspect-square sm:aspect-4/5 overflow-hidden bg-muted rounded-lg">
							<Skeleton className="absolute inset-0 rounded-lg" />

							{/* Wishlist button placeholder (top-right) */}
							<div className="absolute top-2.5 right-2.5 z-20">
								<Skeleton className="size-11 rounded-full" />
							</div>
						</div>

						{/* Content matching ProductCard layout */}
						<div className="flex flex-col gap-2.5 sm:gap-3 relative px-3 pb-3 sm:px-4 sm:pb-4 lg:px-5 lg:pb-5">
							{/* Title */}
							<Skeleton className="h-5 sm:h-6 w-4/5 rounded" />

							{/* Color swatches placeholder */}
							<div className="flex gap-1.5">
								<Skeleton className="size-4 sm:size-5 rounded-full" />
								<Skeleton className="size-4 sm:size-5 rounded-full" />
								<Skeleton className="size-4 sm:size-5 rounded-full" />
							</div>

							{/* Price */}
							<Skeleton className="h-6 w-1/3 rounded" />

							{/* Mobile add-to-cart button */}
							<Skeleton className="h-10 w-full rounded-md sm:hidden" />
						</div>
					</article>
				))}
			</div>

			{/* Pagination */}
			<div className="flex justify-end mt-12">
				<CursorPaginationSkeleton />
			</div>
		</div>
	);
}
