import { use } from "react";
import { type RefundReason, type RefundStatus } from "@/app/generated/prisma/client";
import Link from "next/link";
import { ReceiptText } from "lucide-react";
import { AdminListLiveCount } from "@/shared/components/admin-list-live-count";
import { CursorPagination } from "@/shared/components/cursor-pagination";
import { BulkSelectionProvider } from "@/shared/components/data-table";
import { EmptyResetFiltersAction } from "@/shared/components/data-table/empty-reset-filters-action";
import { TableEmptyState } from "@/shared/components/data-table/table-empty-state";
import {
	MobileSelectionBottomBar,
	MobileSelectionHeader,
} from "@/shared/components/mobile-selection";
import { Button } from "@/shared/components/ui/button";
import { ItemGroup } from "@/shared/components/ui/item";
import { AdminListPendingProvider } from "@/shared/contexts/admin-list-pending-context";
import type {
	GetRefundsParams,
	GetRefundsReturn,
	RefundFilters,
} from "@/modules/refunds/types/refund.types";

import { RefundMobileItem } from "./refund-mobile-item";
import { RefundsBulkActionsBar } from "./refunds-bulk-actions-bar";
import { RefundsCrossPageBanner } from "./refunds-cross-page-banner";

interface RefundsMobileListProps {
	refundsPromise: Promise<GetRefundsReturn>;
	perPage: number;
	hasActiveFilters?: boolean;
	filterParams?: {
		search?: string;
		sortBy?: GetRefundsParams["sortBy"];
		filters?: RefundFilters;
	};
}

export function RefundsMobileList({
	refundsPromise,
	perPage,
	hasActiveFilters,
	filterParams,
}: RefundsMobileListProps) {
	const { refunds, pagination, totalCount } = use(refundsPromise);

	if (refunds.length === 0) {
		return (
			<div className="md:hidden">
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
						) : (
							<Button asChild className="min-h-11 shadow-[0_0_24px_var(--color-glow-pink)]">
								<Link href="/admin/ventes/remboursements/nouveau">Nouveau remboursement</Link>
							</Button>
						)
					}
				/>
			</div>
		);
	}

	const pageItemIds = refunds.map((r) => r.id);

	return (
		<BulkSelectionProvider pageItemIds={pageItemIds}>
			<AdminListPendingProvider
				itemsLabel={{ singular: "remboursement", plural: "remboursements" }}
			>
				<div className="space-y-4 overscroll-contain pb-[calc(var(--bottom-bar-height,5rem)+1rem)] md:hidden md:pb-0">
					<MobileSelectionHeader
						itemsLabel={{ singular: "remboursement", plural: "remboursements" }}
					/>
					{filterParams ? (
						<RefundsCrossPageBanner totalCount={totalCount} filterParams={filterParams} />
					) : null}
					<AdminListLiveCount
						count={refunds.length}
						singular="remboursement"
						plural="remboursements"
					/>
					<ItemGroup aria-label="Remboursements" className="gap-2">
						{refunds.map((refund) => (
							<div key={refund.id} role="listitem">
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
							</div>
						))}
					</ItemGroup>

					<CursorPagination
						perPage={perPage}
						hasNextPage={pagination.hasNextPage}
						hasPreviousPage={pagination.hasPreviousPage}
						currentPageSize={refunds.length}
						nextCursor={pagination.nextCursor}
						prevCursor={pagination.prevCursor}
					/>
				</div>
				<MobileSelectionBottomBar emptyHint="Tape sur les remboursements à régler">
					<RefundsBulkActionsBar presentation="bottom-bar" />
				</MobileSelectionBottomBar>
			</AdminListPendingProvider>
		</BulkSelectionProvider>
	);
}
