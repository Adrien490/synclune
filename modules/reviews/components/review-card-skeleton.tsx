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
				"overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm",
				className
			)}
		>
			<CardContent className="py-4 space-y-4">
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
							<Skeleton
								key={i}
								className="size-20 md:size-24 rounded-lg"
							/>
						))}
					</div>
				)}

				{/* Reponse de la marque */}
				{showResponse && (
					<div className="mt-4 pt-4 border-t border-border">
						<div className="bg-muted/50 rounded-lg p-3 space-y-2">
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

