import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";

export function StoreSettingsFormSkeleton() {
	return (
		<div className="space-y-4 sm:space-y-6">
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between gap-3">
						<Skeleton className="h-6 w-32" />
						<Skeleton className="h-6 w-20 rounded-full" />
					</div>
					<Skeleton className="h-4 w-72" />
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="sm:flex sm:justify-end">
						<Skeleton className="h-11 w-full sm:w-44" />
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
