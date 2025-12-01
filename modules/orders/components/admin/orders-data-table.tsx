import { OrderStatus, PaymentStatus, FulfillmentStatus } from "@/app/generated/prisma/client";
import { CursorPagination } from "@/shared/components/cursor-pagination";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent } from "@/shared/components/ui/card";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/shared/components/ui/empty";
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
import { cn } from "@/shared/utils/cn";
import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { ViewTransition } from "react";
import { OrderRowActions } from "./order-row-actions";
import { OrdersSelectionToolbar } from "./orders-selection-toolbar";
import { OrdersTableSelectionCell } from "./orders-table-selection-cell";

export interface OrdersDataTableProps {
	ordersPromise: Promise<GetOrdersReturn>;
}

// Helper pour formater les prix en euros (format français)
const formatPrice = (priceInCents: number) => {
	return new Intl.NumberFormat("fr-FR", {
		style: "currency",
		currency: "EUR",
	}).format(priceInCents / 100);
};

export async function OrdersDataTable({ ordersPromise }: OrdersDataTableProps) {
	const { orders, pagination } = await ordersPromise;
	const orderIds = orders.map((order) => order.id);

	if (orders.length === 0) {
		return (
			<Empty className="py-12">
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<ShoppingBag />
					</EmptyMedia>
					<EmptyTitle>Aucune commande trouvée</EmptyTitle>
					<EmptyDescription>
						Aucune commande ne correspond aux critères de recherche.
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		);
	}

	return (
		<Card>
			<CardContent>
				<OrdersSelectionToolbar orderIds={orderIds} />
				<div className="overflow-x-auto">
					<Table role="table" aria-label="Liste des commandes" className="min-w-full table-fixed">
						<TableHeader>
							<TableRow>
								<TableHead key="select" scope="col" role="columnheader" className="w-[5%]">
									<OrdersTableSelectionCell type="header" orderIds={orderIds} />
								</TableHead>
								<TableHead
									key="orderNumber"
									scope="col"
									role="columnheader"
									className="w-[25%] sm:w-[20%]"
								>
									Commande
								</TableHead>
								<TableHead
									key="client"
									scope="col"
									role="columnheader"
									className="w-[25%] sm:w-[20%]"
								>
									Client
								</TableHead>
								<TableHead
									key="status"
									scope="col"
									role="columnheader"
									className="w-[20%] sm:w-[15%]"
								>
									Status
								</TableHead>
								<TableHead
									key="total"
									scope="col"
									role="columnheader"
									className="w-[15%] sm:w-[10%] text-right"
								>
									Montant
								</TableHead>
								<TableHead
									key="actions"
									scope="col"
									role="columnheader"
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
									<TableRow key={order.id} className={cn()}>
										<TableCell role="gridcell">
											<OrdersTableSelectionCell type="row" orderId={order.id} />
										</TableCell>
										<TableCell role="gridcell">
											<ViewTransition name={`admin-order-${order.id}`}>
												<Link
													href={`/admin/ventes/commandes/${order.id}`}
													className="font-mono text-sm font-medium text-foreground underline"
												>
													{order.orderNumber}
												</Link>
											</ViewTransition>
										</TableCell>
										<TableCell role="gridcell">
											<span className="text-sm font-medium truncate block">
												{userName}
											</span>
										</TableCell>
										<TableCell role="gridcell">
											<Badge variant={ORDER_STATUS_VARIANTS[order.status as OrderStatus]}>
												{ORDER_STATUS_LABELS[order.status as OrderStatus]}
											</Badge>
										</TableCell>
										<TableCell role="gridcell" className="text-right">
											<span className="text-sm font-bold">
												{formatPrice(order.total)}
											</span>
										</TableCell>
										<TableCell role="gridcell" className="text-right">
											<OrderRowActions
												order={{
													id: order.id,
													orderNumber: order.orderNumber,
													status: order.status as OrderStatus,
													paymentStatus: order.paymentStatus as PaymentStatus,
													fulfillmentStatus: order.fulfillmentStatus as FulfillmentStatus,
													invoiceNumber: order.invoiceNumber,
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
				</div>

				<div className="mt-4">
					<CursorPagination
						perPage={orders.length}
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
