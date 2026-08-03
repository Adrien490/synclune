import { use } from "react";
import { type RefundReason, type RefundStatus } from "@/app/generated/prisma/client";
import { ReceiptText } from "lucide-react";
import { AdminListLiveCount } from "@/shared/components/admin-list-live-count";
import { AdminMobileListPagination } from "@/shared/components/cursor-pagination";
import { EmptyResetFiltersAction } from "@/shared/components/data-table/empty-reset-filters-action";
import { TableEmptyState } from "@/shared/components/data-table/table-empty-state";
import { ItemGroup } from "@/shared/components/ui/item";
import type { GetRefundsReturn } from "@/modules/refunds/types/refund.types";

import { RefundMobileItem } from "./refund-mobile-item";
import { ADMIN_LIST_PENDING_CLASS } from "@/shared/components/admin-list-pending.styles";
import { cn } from "@/shared/utils/cn";

interface RefundsMobileListProps {
	refundsPromise: Promise<GetRefundsReturn>;
	perPage: number;
	hasActiveFilters?: boolean;
}

export function RefundsMobileList({
	refundsPromise,
	perPage,
	hasActiveFilters,
}: RefundsMobileListProps) {
	const { refunds, pagination, totalCount } = use(refundsPromise);

	if (refunds.length === 0) {
		return (
			<div className={cn(ADMIN_LIST_PENDING_CLASS, "md:hidden")}>
				<TableEmptyState
					icon={ReceiptText}
					title="Aucun remboursement trouvé"
					description={
						hasActiveFilters
							? "Aucun remboursement ne correspond aux critères de recherche."
							: "Aucun remboursement à régler pour le moment."
					}
					actionElement={
						hasActiveFilters ? (
							<EmptyResetFiltersAction href="/admin/ventes/remboursements" />
						) : undefined
					}
				/>
			</div>
		);
	}

	return (
		<div
			className={cn(
				ADMIN_LIST_PENDING_CLASS,
				"space-y-4 overscroll-contain pb-[calc(var(--bottom-bar-height,56px)+1rem)] md:hidden md:pb-0",
			)}
		>
			<AdminListLiveCount
				count={refunds.length}
				singular="remboursement"
				plural="remboursements"
				totalCount={totalCount}
			/>
			<ItemGroup aria-label="Remboursements" className="gap-2">
				{refunds.map((refund) => (
					<li key={refund.id}>
						<RefundMobileItem
							refund={{
								id: refund.id,
								status: refund.status as RefundStatus,
								amount: refund.amount,
								reason: refund.reason as RefundReason,
								createdAt: refund.createdAt,
								order: {
									id: refund.order.id,
									orderNumber: refund.order.orderNumber,
									customerName: refund.order.customerName,
									customerEmail: refund.order.customerEmail,
								},
							}}
						/>
					</li>
				))}
			</ItemGroup>

			<AdminMobileListPagination
				perPage={perPage}
				hasNextPage={pagination.hasNextPage}
				hasPreviousPage={pagination.hasPreviousPage}
				currentPageSize={refunds.length}
				nextCursor={pagination.nextCursor}
				prevCursor={pagination.prevCursor}
				totalCount={totalCount}
			/>
		</div>
	);
}
