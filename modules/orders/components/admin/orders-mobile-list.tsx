import { use } from "react";
import { ReceiptIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";

import { AdminListLiveCount } from "@/shared/components/admin-list-live-count";
import { AdminMobileListPagination } from "@/shared/components/cursor-pagination";
import { EmptyResetFiltersAction } from "@/shared/components/data-table/empty-reset-filters-action";
import { TableEmptyState } from "@/shared/components/data-table/table-empty-state";
import { ItemGroup } from "@/shared/components/ui/item";
import { ADMIN_LIST_PENDING_CLASS } from "@/shared/components/admin-list-pending.styles";
import { cn } from "@/shared/utils/cn";
import { formatEuro } from "@/shared/utils/format-euro";
import { formatDateShort } from "@/shared/utils/dates";

import type { GetOrdersReturn } from "../../data/get-orders";
import { orderDisplayLabel } from "./orders-data-table";
import { OrderStatusBadge } from "./order-status-badge";

interface OrdersMobileListProps {
	ordersPromise: Promise<GetOrdersReturn>;
	perPage: number;
	hasActiveFilters?: boolean;
}

export function OrdersMobileList({
	ordersPromise,
	perPage,
	hasActiveFilters,
}: OrdersMobileListProps) {
	const { orders, pagination, totalCount } = use(ordersPromise);

	if (orders.length === 0) {
		return (
			<div className={cn(ADMIN_LIST_PENDING_CLASS, "md:hidden")}>
				<TableEmptyState
					icon={ReceiptIcon}
					title="Aucune commande trouvée"
					description={
						hasActiveFilters
							? "Aucune commande ne correspond aux critères de recherche."
							: "Les commandes apparaîtront ici dès le premier paiement."
					}
					actionElement={
						hasActiveFilters ? <EmptyResetFiltersAction href="/admin/ventes/commandes" /> : null
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
				count={orders.length}
				singular="commande"
				plural="commandes"
				totalCount={totalCount}
			/>
			<ItemGroup aria-label="Commandes" className="gap-2">
				{orders.map((order) => (
					<li key={order.id}>
						<Link
							href={`/admin/ventes/commandes/${order.id}`}
							className="bg-card focus-visible:ring-ring block rounded-xl border p-4 outline-none focus-visible:ring-2"
						>
							<div className="flex items-baseline justify-between gap-3">
								<span className="font-medium">{orderDisplayLabel(order)}</span>
								<span className="text-sm font-medium">{formatEuro(order.amountTotalCents)}</span>
							</div>
							<p className="text-muted-foreground mt-1 truncate text-sm">
								{order.customerName ?? (order.email || "—")}
							</p>
							<div className="mt-2 flex items-center justify-between gap-3">
								<OrderStatusBadge status={order.status} />
								<span className="text-muted-foreground text-xs">
									{formatDateShort(order.createdAt)}
								</span>
							</div>
						</Link>
					</li>
				))}
			</ItemGroup>

			<AdminMobileListPagination
				perPage={perPage}
				hasNextPage={pagination.hasNextPage}
				hasPreviousPage={pagination.hasPreviousPage}
				currentPageSize={orders.length}
				nextCursor={pagination.nextCursor}
				prevCursor={pagination.prevCursor}
				totalCount={totalCount}
			/>
		</div>
	);
}
