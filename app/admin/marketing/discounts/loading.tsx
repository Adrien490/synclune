import { DiscountsDataTableSkeleton } from "@/modules/discounts/components/admin/discounts-data-table-skeleton";
import { DiscountsMobileListSkeleton } from "@/modules/discounts/components/admin/discounts-mobile-list-skeleton";
import { PageHeader } from "@/shared/components/page-header";
import { StickyActionBarSkeleton } from "@/shared/components/sticky-action-bar";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { ToolbarSkeleton } from "@/shared/components/toolbar-skeleton";

export default function DiscountsLoading() {
	return (
		<div
			role="status"
			aria-busy="true"
			aria-label="Chargement des codes promo"
			className="space-y-6"
		>
			<span className="sr-only">Chargement des codes promo…</span>

			<PageHeader
				variant="compact"
				title="Codes promo"
				actions={<Skeleton className="h-10 w-36" />}
				className="hidden md:block"
			/>

			<StickyActionBarSkeleton itemCount={4} />

			<ToolbarSkeleton selectCount={1} buttonCount={1} className="hidden md:flex" />

			<div className="min-h-[1px]" aria-hidden="true" />

			<DiscountsMobileListSkeleton />
			<DiscountsDataTableSkeleton />
		</div>
	);
}
