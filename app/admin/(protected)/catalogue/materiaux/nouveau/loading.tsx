import { AdminFormFooter } from "@/shared/components/admin-form-footer";
import { PageHeaderSkeleton } from "@/shared/components/page-header-skeleton";
import { Skeleton } from "@/shared/components/ui/skeleton";

export default function CreateMaterialLoading() {
	return (
		<div role="status" aria-busy="true" aria-label="Chargement du formulaire" className="space-y-6">
			<span className="sr-only">Chargement du formulaire…</span>

			<PageHeaderSkeleton variant="compact" hasDescription={false} className="hidden md:block" />

			<div className="max-w-lg space-y-6">
				<Skeleton className="h-4 w-48" />

				<div className="space-y-4">
					{/* Nom */}
					<div className="space-y-2">
						<Skeleton className="h-4 w-12" />
						<Skeleton className="h-10 w-full" />
					</div>

					{/* Description */}
					<div className="space-y-2">
						<Skeleton className="h-4 w-24" />
						<Skeleton className="h-20 w-full" />
					</div>
				</div>

				<AdminFormFooter>
					<div className="flex justify-end">
						<Skeleton className="h-11 w-full sm:w-auto sm:min-w-56" />
					</div>
				</AdminFormFooter>
			</div>
		</div>
	);
}
