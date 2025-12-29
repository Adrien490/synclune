import { Card, CardContent } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";

export function AccountStatsCardsSkeleton() {
	return (
		<div className="grid gap-4 sm:grid-cols-2">
			<Card>
				<CardContent className="pt-6">
					<Skeleton className="h-4 w-24 mb-2" />
					<Skeleton className="h-6 w-32" />
				</CardContent>
			</Card>

			<Card>
				<CardContent className="pt-6">
					<Skeleton className="h-4 w-32 mb-2" />
					<Skeleton className="h-6 w-24" />
				</CardContent>
			</Card>
		</div>
	);
}
