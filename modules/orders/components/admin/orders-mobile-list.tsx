import { use } from "react";
import { ShoppingBag } from "lucide-react";
import { AdminListLiveCount } from "@/shared/components/admin-list-live-count";
import { CursorPagination } from "@/shared/components/cursor-pagination";
import { TableEmptyState } from "@/shared/components/data-table/table-empty-state";
import { ItemGroup } from "@/shared/components/ui/item";
import type { GetOrdersReturn } from "@/modules/orders/types/order.types";
import { OrdersMobileListItem } from "./orders-mobile-list-item";

interface OrdersMobileListProps {
	ordersPromise: Promise<GetOrdersReturn>;
	perPage: number;
}

export function OrdersMobileList({ ordersPromise, perPage }: OrdersMobileListProps) {
	const { orders, pagination } = use(ordersPromise);

	if (orders.length === 0) {
		return (
			<div className="md:hidden">
				<TableEmptyState
					icon={ShoppingBag}
					title="Aucune commande trouvée"
					description="Aucune commande ne correspond aux critères de recherche."
				/>
			</div>
		);
	}

	return (
		<div className="space-y-4 pb-[calc(var(--bottom-bar-height,5rem)+1rem)] md:hidden md:pb-0">
			<AdminListLiveCount count={orders.length} singular="commande" plural="commandes" />
			<ItemGroup aria-label="Commandes" className="gap-2">
				{orders.map((order) => (
					<div key={order.id} role="listitem">
						<OrdersMobileListItem order={order} />
					</div>
				))}
			</ItemGroup>

			<CursorPagination
				perPage={perPage}
				hasNextPage={pagination.hasNextPage}
				hasPreviousPage={pagination.hasPreviousPage}
				currentPageSize={orders.length}
				nextCursor={pagination.nextCursor}
				prevCursor={pagination.prevCursor}
			/>
		</div>
	);
}
