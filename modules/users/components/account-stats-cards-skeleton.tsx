import { Card, CardContent } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";

export function AccountStatsCardsSkeleton() {
	return (
		<div className="grid gap-4 sm:grid-cols-2">
			<Card className="shadow-none">
				<CardContent className="py-0">
					<Skeleton className="mb-2 h-4 w-24" />
					<Skeleton className="h-6 w-32" />
				</CardContent>
			</Card>

			<Card className="shadow-none">
				<CardContent className="py-0">
					<Skeleton className="mb-2 h-4 w-32" />
					<Skeleton className="h-6 w-24" />
				</CardContent>
			</Card>
		</div>
	);
}
