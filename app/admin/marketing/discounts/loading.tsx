import { PageHeader } from "@/shared/components/page-header";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { DiscountsDataTableSkeleton } from "@/modules/discounts/components/admin/discounts-data-table-skeleton";

/**
 * Loading state for discounts management page
 * Structure alignee avec la vraie page:
 * - PageHeader avec bouton create
 * - Toolbar (search, sort, filter)
 * - DiscountsDataTable
 */
export default function DiscountsLoading() {
	return (
		<div role="status" aria-busy="true" aria-label="Chargement des codes promo">
			<span className="sr-only">Chargement des codes promo...</span>

			{/* Page Header */}
			<PageHeader
				variant="compact"
				title="Codes promo"
				actions={<Skeleton className="h-10 w-36" />}
			/>

			<div className="space-y-6">
				{/* Toolbar skeleton: search + sort + filter (3 items, no refresh button) */}
				<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
					<Skeleton className="h-10 flex-1 sm:max-w-md" />
					<Skeleton className="h-10 w-full sm:w-45" />
					<Skeleton className="h-10 w-10" />
				</div>

				{/* Data Table */}
				<DiscountsDataTableSkeleton />
			</div>
		</div>
	);
}
