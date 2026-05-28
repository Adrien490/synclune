import { AdminFormFooter } from "@/shared/components/admin-form-footer";
import { PageHeaderSkeleton } from "@/shared/components/page-header-skeleton";
import { Skeleton } from "@/shared/components/ui/skeleton";

export default function BillingAddressLoading() {
	return (
		<div
			role="status"
			aria-busy="true"
			aria-label="Chargement de l'adresse de facturation"
			className="space-y-6"
		>
			<span className="sr-only">Chargement de l&apos;adresse de facturation…</span>
			<PageHeaderSkeleton variant="compact" hasDescription={false} className="hidden md:block" />
			<div className="max-w-2xl space-y-4">
				<div className="flex items-center gap-2">
					<Skeleton className="size-5 rounded" />
					<Skeleton className="h-4 w-64" />
				</div>
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					{Array.from({ length: 2 }).map((_, i) => (
						<div key={i} className="space-y-2">
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-10 w-full" />
						</div>
					))}
				</div>
				{Array.from({ length: 4 }).map((_, i) => (
					<div key={i} className="space-y-2">
						<Skeleton className="h-4 w-28" />
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
