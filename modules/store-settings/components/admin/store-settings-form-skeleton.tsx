import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";

export function StoreSettingsFormSkeleton() {
	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<Skeleton className="h-6 w-40" />
					<Skeleton className="h-4 w-64" />
				</CardHeader>
				<CardContent className="space-y-4">
					<Skeleton className="h-5 w-32" />
					<Skeleton className="h-11 w-full" />
				</CardContent>
			</Card>
			<Card>
				<CardHeader>
					<Skeleton className="h-6 w-56" />
					<Skeleton className="h-4 w-72" />
				</CardHeader>
				<CardContent className="space-y-4">
					<Skeleton className="h-11 w-full" />
					<Skeleton className="h-24 w-full" />
					<Skeleton className="h-11 w-full" />
					<div className="flex justify-end">
						<Skeleton className="h-11 w-44" />
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
