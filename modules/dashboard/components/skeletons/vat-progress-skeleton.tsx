import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { cn } from "@/shared/utils/cn";

interface VatProgressSkeletonProps {
	ariaLabel?: string;
}

/**
 * Skeleton matching VatProgressCard's structure (anti-CLS) :
 * header (title + icon), value/threshold row, progress bar, status caption.
 */
export function VatProgressSkeleton({
	ariaLabel = "Chargement du suivi de seuil TVA",
}: VatProgressSkeletonProps) {
	return (
		<div role="status" aria-busy="true" aria-label={ariaLabel}>
			<Card
				className={cn(
					"border-info/40 from-info/5 via-background relative overflow-hidden border-l-4 bg-linear-to-br to-transparent",
				)}
			>
				<CardHeader className="flex flex-row items-center justify-between pb-2">
					<div className="flex items-center gap-1.5">
						<Skeleton className="h-4 w-28" />
					</div>
					<Skeleton className="size-8 rounded-full" />
				</CardHeader>
				<CardContent className="space-y-3">
					<div className="flex items-baseline justify-between gap-2">
						<Skeleton className="h-7 w-24" />
						<Skeleton className="h-4 w-16" />
					</div>
					<Skeleton className="h-2 w-full rounded-full" />
					<Skeleton className="h-3 w-2/3" />
				</CardContent>
			</Card>
		</div>
	);
}
