import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { cn } from "@/shared/utils/cn";
import { CHART_STYLES } from "../../constants/chart-styles";

export function FulfillmentSkeleton() {
	return (
		<Card
			className={CHART_STYLES.card}
			role="status"
			aria-busy="true"
			aria-label="Chargement du pipeline d'expédition"
		>
			<CardHeader className="pb-3">
				<Skeleton className="h-5 w-40" />
				<Skeleton className="h-4 w-28" />
			</CardHeader>
			<CardContent>
				<Skeleton className={cn("h-5 w-full rounded-full sm:h-3")} />
				<div className="mt-3 flex gap-4">
					{Array.from({ length: 4 }).map((_, i) => (
						<div key={i} className="flex items-center gap-1.5">
							<Skeleton className="size-2.5 rounded-full" />
							<Skeleton className="h-3 w-16" />
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}
