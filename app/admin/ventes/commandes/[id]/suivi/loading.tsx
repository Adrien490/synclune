import { AdminFormFooter } from "@/shared/components/admin-form-footer";
import { PageHeaderSkeleton } from "@/shared/components/page-header-skeleton";
import { Skeleton } from "@/shared/components/ui/skeleton";

export default function OrderTrackingLoading() {
	return (
		<div role="status" aria-busy="true" aria-label="Chargement du suivi" className="space-y-6">
			<span className="sr-only">Chargement du suivi…</span>
			<PageHeaderSkeleton variant="compact" hasDescription={false} className="hidden md:block" />
			<div className="max-w-2xl space-y-4">
				<div className="space-y-2">
					<Skeleton className="h-4 w-32" />
					<Skeleton className="h-10 w-full" />
				</div>
				<div className="space-y-2">
					<Skeleton className="h-4 w-40" />
					<Skeleton className="h-10 w-full" />
				</div>
				<div className="space-y-2">
					<Skeleton className="h-4 w-36" />
					<Skeleton className="h-10 w-full" />
				</div>
				<AdminFormFooter>
					<div className="flex justify-end">
						<Skeleton className="h-11 w-full sm:w-auto sm:min-w-32" />
					</div>
				</AdminFormFooter>
			</div>
		</div>
	);
}
