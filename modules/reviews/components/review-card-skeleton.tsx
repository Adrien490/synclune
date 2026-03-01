import { Skeleton } from "@/shared/components/ui/skeleton";
import { CardContent } from "@/shared/components/ui/card";
import { cn } from "@/shared/utils/cn";

interface ReviewCardSkeletonProps {
	className?: string;
	showMedia?: boolean;
	showResponse?: boolean;
}

/**
 * Skeleton pour ReviewCard
 */
export function ReviewCardSkeleton({
	className,
	showMedia = false,
	showResponse = false,
}: ReviewCardSkeletonProps) {
	return (
		<article
			className={cn(
				"bg-card text-card-foreground overflow-hidden rounded-lg border shadow-sm",
				className,
			)}
		>
			<CardContent className="space-y-4 py-4">
				{/* En-tete: nom, date, etoiles */}
				<div className="space-y-1">
					<Skeleton className="h-5 w-32" />
					<div className="flex items-center gap-2">
						<Skeleton className="h-4 w-24" />
						<Skeleton className="h-3 w-20" />
					</div>
				</div>

				{/* Titre et contenu */}
				<div className="space-y-2">
					<Skeleton className="h-5 w-48" />
					<div className="space-y-1">
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-4 w-2/3" />
					</div>
				</div>

				{/* Photos */}
				{showMedia && (
					<div className="flex gap-2">
						{Array.from({ length: 3 }).map((_, i) => (
							<Skeleton key={i} className="size-20 rounded-lg md:size-24" />
						))}
					</div>
				)}

				{/* Reponse de la marque */}
				{showResponse && (
					<div className="border-border mt-4 border-t pt-4">
						<div className="bg-muted/50 space-y-2 rounded-lg p-3">
							<div className="flex items-center gap-2">
								<Skeleton className="h-3 w-24" />
								<Skeleton className="h-3 w-16" />
							</div>
							<Skeleton className="h-4 w-full" />
							<Skeleton className="h-4 w-3/4" />
						</div>
					</div>
				)}
			</CardContent>
		</article>
	);
}
