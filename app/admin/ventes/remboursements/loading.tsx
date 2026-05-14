import { RefundsDataTableSkeleton } from "@/modules/refunds/components/admin/refunds-data-table-skeleton";
import { RefundsMobileListSkeleton } from "@/modules/refunds/components/admin/refunds-mobile-list-skeleton";
import { PageHeader } from "@/shared/components/page-header";
import { StickyActionBarSkeleton } from "@/shared/components/sticky-action-bar";
import { ToolbarSkeleton } from "@/shared/components/toolbar-skeleton";

export default function RefundsAdminLoading() {
	return (
		<div
			role="status"
			aria-busy="true"
			aria-label="Chargement des remboursements"
			className="space-y-6"
		>
			<span className="sr-only">Chargement des remboursements…</span>

			<PageHeader variant="compact" title="Remboursements" className="hidden md:block" />

			<StickyActionBarSkeleton itemCount={3} />

			<ToolbarSkeleton selectCount={1} buttonCount={1} className="hidden md:flex" />

			<div className="min-h-[1px]" aria-hidden="true" />

			<RefundsMobileListSkeleton />
			<RefundsDataTableSkeleton />
		</div>
	);
}
