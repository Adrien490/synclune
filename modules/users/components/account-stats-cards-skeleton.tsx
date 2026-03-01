import { Skeleton } from "@/shared/components/ui/skeleton";

export function AccountStatsCardsSkeleton() {
	return (
		<div className="grid gap-4 sm:grid-cols-2">
			<div className="border-border/60 rounded-xl border p-4">
				<Skeleton className="mb-2 h-4 w-24" />
				<Skeleton className="h-6 w-32" />
			</div>

			<div className="border-border/60 rounded-xl border p-4">
				<Skeleton className="mb-2 h-4 w-32" />
				<Skeleton className="h-6 w-24" />
			</div>
		</div>
	);
}
