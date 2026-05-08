import { DiscountsDataTableSkeleton } from "@/modules/discounts/components/admin/discounts-data-table-skeleton";
import { DiscountsMobileListSkeleton } from "@/modules/discounts/components/admin/discounts-mobile-list-skeleton";
import { PageHeader } from "@/shared/components/page-header";
import { ToolbarSkeleton } from "@/shared/components/toolbar-skeleton";
import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Loading state for discounts management page.
 * Aligned with page.tsx: PageHeader + Toolbar + FilterBadges + MobileList + DataTable.
 */
export default function DiscountsLoading() {
	return (
		<div role="status" aria-busy="true" aria-label="Chargement des codes promo">
			<span className="sr-only">Chargement des codes promo…</span>

			<PageHeader
				variant="compact"
				title="Codes promo"
				actions={<Skeleton className="h-10 w-36" />}
				className="hidden md:block"
			/>

			<div className="space-y-6">
				<ToolbarSkeleton selectCount={1} buttonCount={1} />

				{/* Filter badges placeholder */}
				<div className="min-h-[1px]" aria-hidden="true" />

				<DiscountsMobileListSkeleton />

				<div className="hidden md:block">
					<DiscountsDataTableSkeleton />
				</div>
			</div>
		</div>
	);
}
