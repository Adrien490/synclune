import { Skeleton } from "@/shared/components/ui/skeleton";
import { Separator } from "@/shared/components/ui/separator";

export function ReviewDetailPageSkeleton() {
	return (
		<div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
			<header className="space-y-2">
				<Skeleton className="h-8 w-64" />
				<Skeleton className="h-4 w-48" />
			</header>

			<Separator />

			<section className="space-y-2">
				<div className="flex items-center justify-between">
					<div className="space-y-1">
						<Skeleton className="h-5 w-40" />
						<Skeleton className="h-4 w-56" />
					</div>
					<Skeleton className="h-6 w-20" />
				</div>
				<Skeleton className="h-4 w-32" />
			</section>

			<Separator />

			<section className="space-y-2">
				<Skeleton className="h-5 w-48" />
				<Skeleton className="h-4 w-full" />
				<Skeleton className="h-4 w-5/6" />
				<Skeleton className="size-4/6" />
			</section>

			<Separator />

			<section className="space-y-3">
				<Skeleton className="h-5 w-40" />
				<Skeleton className="h-32 w-full rounded-lg" />
			</section>
		</div>
	);
}
