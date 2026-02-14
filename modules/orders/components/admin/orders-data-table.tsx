import { OrderStatus, PaymentStatus, FulfillmentStatus } from "@/app/generated/prisma/client";
import { CursorPagination } from "@/shared/components/cursor-pagination";
import { TableScrollContainer } from "@/shared/components/table-scroll-container";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent } from "@/shared/components/ui/card";
import { TableEmptyState } from "@/shared/components/data-table/table-empty-state";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/components/ui/table";
import {
	ORDER_STATUS_LABELS,
	ORDER_STATUS_VARIANTS,
} from "@/modules/orders/constants/status-display";
import type { GetOrdersReturn } from "@/modules/orders/types/orders.types";
import { formatEuro } from "@/shared/utils/format-euro";
import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { OrderRowActions } from "./order-row-actions";
import { OrdersSelectionToolbar } from "./orders-selection-toolbar";
import { TableSelectionCell } from "@/shared/components/table-selection-cell";

export interface OrdersDataTableProps {
	ordersPromise: Promise<GetOrdersReturn>;
	perPage: number;
}

export async function OrdersDataTable({ ordersPromise, perPage }: OrdersDataTableProps) {
	const { orders, pagination } = await ordersPromise;
	const orderIds = orders.map((order) => order.id);

	if (orders.length === 0) {
		return (
			<TableEmptyState
				icon={ShoppingBag}
				title="Aucune commande trouvee"
				description="Aucune commande ne correspond aux criteres de recherche."
			/>
		);
	}

	return (
		<Card>
			<CardContent>
				<OrdersSelectionToolbar orderIds={orderIds} />
				<TableScrollContainer>
					<Table caption="Liste des commandes" striped className="min-w-full table-fixed">
						<TableHeader>
							<TableRow>
								<TableHead className="w-[5%]">
									<TableSelectionCell type="header" itemIds={orderIds} />
								</TableHead>
								<TableHead className="w-[25%] sm:w-[20%]">
									Commande
								</TableHead>
								<TableHead className="hidden sm:table-cell w-[20%]">
									Client
								</TableHead>
								<TableHead className="w-[20%] sm:w-[15%]">
									Statut
								</TableHead>
								<TableHead className="hidden sm:table-cell w-[10%] text-right">
									Montant
								</TableHead>
								<TableHead
									className="w-[15%] sm:w-[10%] text-right"
									aria-label="Actions disponibles pour chaque commande"
								>
									Actions
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{orders.map((order) => {
								const userName =
									order.user?.name || order.user?.email || "Invité";

								return (
									<TableRow key={order.id}>
										<TableCell>
											<TableSelectionCell type="row" itemId={order.id} />
										</TableCell>
										<TableCell>
											<Link
												href={`/admin/ventes/commandes/${order.id}`}
												className="tabular-nums text-sm font-medium text-foreground underline"
												aria-label={`Voir commande ${order.orderNumber}`}
											>
												{order.orderNumber}
											</Link>
										</TableCell>
										<TableCell className="hidden sm:table-cell">
											<span className="text-sm font-medium truncate block">
												{userName}
											</span>
										</TableCell>
										<TableCell>
											<Badge variant={ORDER_STATUS_VARIANTS[order.status as OrderStatus]}>
												{ORDER_STATUS_LABELS[order.status as OrderStatus]}
											</Badge>
										</TableCell>
										<TableCell className="hidden sm:table-cell text-right">
											<span className="text-sm font-bold">
												{formatEuro(order.total)}
											</span>
										</TableCell>
										<TableCell className="text-right">
											<OrderRowActions
												order={{
													id: order.id,
													orderNumber: order.orderNumber,
													status: order.status as OrderStatus,
													paymentStatus: order.paymentStatus as PaymentStatus,
													fulfillmentStatus: order.fulfillmentStatus as FulfillmentStatus,
													trackingNumber: order.trackingNumber,
													trackingUrl: order.trackingUrl,
												}}
											/>
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</TableScrollContainer>

				<div className="mt-4">
					<CursorPagination
						perPage={perPage}
						hasNextPage={pagination.hasNextPage}
						hasPreviousPage={pagination.hasPreviousPage}
						currentPageSize={orders.length}
						nextCursor={pagination.nextCursor}
						prevCursor={pagination.prevCursor}
					/>
				</div>
			</CardContent>
		</Card>
	);
}
