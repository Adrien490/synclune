import { Skeleton } from "@/shared/components/ui/skeleton";

export function AccountStatsCardsSkeleton() {
	return (
		<div className="grid gap-4 sm:grid-cols-2">
			<div className="rounded-xl border border-border/60 p-4">
				<Skeleton className="h-4 w-24 mb-2" />
				<Skeleton className="h-6 w-32" />
			</div>

			<div className="rounded-xl border border-border/60 p-4">
				<Skeleton className="h-4 w-32 mb-2" />
				<Skeleton className="h-6 w-24" />
			</div>
		</div>
	);
}
