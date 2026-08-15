import { use } from "react";
import { ReceiptIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";

import { AdminDataTable, TableEmptyState } from "@/shared/components/data-table";
import { EmptyResetFiltersAction } from "@/shared/components/data-table/empty-reset-filters-action";
import { Card, CardContent } from "@/shared/components/ui/card";
import {
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/components/ui/table";
import { formatEuro } from "@/shared/utils/format-euro";
import { formatDateShort } from "@/shared/utils/dates";

import type { GetOrdersReturn, OrderListItem } from "../../data/get-orders";
import { OrderRowActions } from "./order-row-actions";
import { OrderStatusBadge } from "./order-status-badge";

/** « n° 12 » dès la facture émise ; l'id court sinon (commande PENDING). */
export function orderDisplayLabel(order: Pick<OrderListItem, "id" | "invoiceNumber">): string {
	return order.invoiceNumber != null ? `n° ${order.invoiceNumber}` : `…${order.id.slice(-6)}`;
}

interface OrdersDataTableProps {
	ordersPromise: Promise<GetOrdersReturn>;
	perPage: number;
	hasActiveFilters?: boolean;
}

export function OrdersDataTable({
	ordersPromise,
	perPage,
	hasActiveFilters = false,
}: OrdersDataTableProps) {
	const { orders, pagination, totalCount } = use(ordersPromise);

	if (orders.length === 0) {
		return (
			<Card className="hidden md:block">
				<CardContent className="py-12">
					<TableEmptyState
						icon={ReceiptIcon}
						title="Aucune commande trouvée"
						description="Aucune commande ne correspond aux critères."
						noItemsDescription="Les commandes apparaîtront ici dès le premier paiement."
						hasActiveFilters={hasActiveFilters}
						actionElement={
							hasActiveFilters ? <EmptyResetFiltersAction href="/admin/ventes/commandes" /> : null
						}
					/>
				</CardContent>
			</Card>
		);
	}

	return (
		<AdminDataTable
			caption="Liste des commandes"
			pagination={{
				perPage,
				hasNextPage: pagination.hasNextPage,
				hasPreviousPage: pagination.hasPreviousPage,
				currentPageSize: orders.length,
				nextCursor: pagination.nextCursor,
				prevCursor: pagination.prevCursor,
				totalCount,
			}}
		>
			<TableHeader>
				<TableRow>
					<TableHead className="w-[12%]">Numéro</TableHead>
					<TableHead className="w-[14%]">Date</TableHead>
					<TableHead className="w-[28%]">Cliente</TableHead>
					<TableHead className="w-[8%] text-center">Articles</TableHead>
					<TableHead className="w-[12%] text-right">Total</TableHead>
					<TableHead className="w-[18%]">Statut</TableHead>
					<TableHead className="w-[8%] text-right" aria-label="Actions par commande">
						Actions
					</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{orders.map((order) => {
					const label = orderDisplayLabel(order);
					return (
						<TableRow key={order.id}>
							<TableCell>
								<Link
									href={`/admin/ventes/commandes/${order.id}`}
									className="hover:text-primary focus-visible:ring-ring rounded-md font-medium transition-colors outline-none focus-visible:ring-2"
								>
									{label}
								</Link>
							</TableCell>
							<TableCell className="text-muted-foreground text-sm">
								{formatDateShort(order.createdAt)}
							</TableCell>
							<TableCell>
								<div className="flex min-w-0 flex-col">
									{order.customerName && <span className="truncate">{order.customerName}</span>}
									<span className="text-muted-foreground truncate text-sm">
										{order.email || "—"}
									</span>
								</div>
							</TableCell>
							<TableCell className="text-center text-sm">{order._count.items}</TableCell>
							<TableCell className="text-right">
								<span className="text-sm font-medium">{formatEuro(order.amountTotalCents)}</span>
							</TableCell>
							<TableCell>
								<OrderStatusBadge status={order.status} />
							</TableCell>
							<TableCell className="text-right">
								<OrderRowActions orderId={order.id} orderLabel={label} status={order.status} />
							</TableCell>
						</TableRow>
					);
				})}
			</TableBody>
		</AdminDataTable>
	);
}
