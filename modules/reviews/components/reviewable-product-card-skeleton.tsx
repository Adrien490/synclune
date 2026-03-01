import { Skeleton } from "@/shared/components/ui/skeleton";

export function ReviewableProductCardSkeleton() {
	return (
		<div className="border-border/60 overflow-hidden rounded-lg border">
			<div className="flex flex-col sm:flex-row">
				{/* Image */}
				<Skeleton className="aspect-[3/2] w-full shrink-0 sm:aspect-auto sm:h-auto sm:w-32" />

				{/* Content */}
				<div className="flex-1 space-y-3 p-4">
					<div>
						<Skeleton className="bg-muted/50 h-5 w-36" />
						<Skeleton className="bg-muted/30 mt-1.5 h-3 w-28" />
					</div>
					<Skeleton className="bg-muted/40 h-9 w-32" />
				</div>
			</div>
		</div>
	);
}
