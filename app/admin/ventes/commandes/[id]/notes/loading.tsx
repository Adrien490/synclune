import { AdminFormFooter } from "@/shared/components/admin-form-footer";
import { PageHeaderSkeleton } from "@/shared/components/page-header-skeleton";
import { Skeleton } from "@/shared/components/ui/skeleton";

export default function OrderNotesLoading() {
	return (
		<div
			role="status"
			aria-busy="true"
			aria-label="Chargement des notes"
			className="flex h-full min-h-0 flex-col gap-4"
		>
			<span className="sr-only">Chargement des notes…</span>
			<PageHeaderSkeleton variant="compact" hasDescription className="hidden md:block" />
			<div className="max-w-2xl space-y-3">
				<Skeleton className="h-40 w-full" />
				<AdminFormFooter>
					<div className="flex justify-end">
						<Skeleton className="h-11 w-full sm:w-auto sm:min-w-32" />
					</div>
				</AdminFormFooter>
			</div>
		</div>
	);
}
