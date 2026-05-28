import { AdminFormFooter } from "@/shared/components/admin-form-footer";
import { PageHeaderSkeleton } from "@/shared/components/page-header-skeleton";
import { Skeleton } from "@/shared/components/ui/skeleton";

export default function OrderCustomerLoading() {
	return (
		<div
			role="status"
			aria-busy="true"
			aria-label="Chargement des informations client"
			className="space-y-6"
		>
			<span className="sr-only">Chargement des informations client…</span>
			<PageHeaderSkeleton variant="compact" hasDescription={false} className="hidden md:block" />
			<div className="max-w-2xl space-y-4">
				{Array.from({ length: 3 }).map((_, i) => (
					<div key={i} className="space-y-2">
						<Skeleton className="h-4 w-32" />
						<Skeleton className="h-10 w-full" />
					</div>
				))}
				<AdminFormFooter>
					<div className="flex justify-end">
						<Skeleton className="h-11 w-full sm:w-auto sm:min-w-32" />
					</div>
				</AdminFormFooter>
			</div>
		</div>
	);
}
