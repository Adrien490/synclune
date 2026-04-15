import { use } from "react";
import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { CursorPagination } from "@/shared/components/cursor-pagination";
import { TableEmptyState } from "@/shared/components/data-table/table-empty-state";
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemTitle,
} from "@/shared/components/ui/item";
import { Badge } from "@/shared/components/ui/badge";
import { formatEuro } from "@/shared/utils/format-euro";
import { formatDateShort } from "@/shared/utils/dates";
import type { GetOrdersReturn } from "@/modules/orders/types/order.types";
import {
	ORDER_STATUS_LABELS,
	ORDER_STATUS_VARIANTS,
	PAYMENT_STATUS_LABELS,
	PAYMENT_STATUS_VARIANTS,
} from "@/modules/orders/constants/status-display";
import { OrderRowActions } from "./order-row-actions";
import { OrdersSelectionToolbar } from "./orders-selection-toolbar";

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
		<div className="space-y-4 pb-20 md:hidden md:pb-0">
			<OrdersSelectionToolbar />

			<ItemGroup aria-label="Commandes" className="gap-2">
				{orders.map((order) => (
					<div key={order.id} role="listitem">
						<Item
							variant="outline"
							size="sm"
							className="gap-3"
							aria-roledescription="carte commande"
						>
							<ItemContent className="min-w-0">
								<ItemTitle>
									<Link
										href={`/admin/ventes/commandes/${order.id}`}
										className="truncate font-semibold hover:underline"
									>
										{order.orderNumber}
									</Link>
									<Badge variant={ORDER_STATUS_VARIANTS[order.status]}>
										{ORDER_STATUS_LABELS[order.status]}
									</Badge>
									<Badge variant={PAYMENT_STATUS_VARIANTS[order.paymentStatus]}>
										{PAYMENT_STATUS_LABELS[order.paymentStatus]}
									</Badge>
								</ItemTitle>
								<ItemDescription className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
									<span>{order.customerName ?? order.customerEmail}</span>
									<span aria-hidden="true">·</span>
									<span className="font-medium">{formatEuro(order.total)}</span>
									<span aria-hidden="true">·</span>
									<span>{formatDateShort(order.createdAt)}</span>
									<span aria-hidden="true">·</span>
									<span>
										{order._count.items} article{order._count.items > 1 ? "s" : ""}
									</span>
								</ItemDescription>
							</ItemContent>
							<ItemActions>
								<OrderRowActions order={order} />
							</ItemActions>
						</Item>
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
