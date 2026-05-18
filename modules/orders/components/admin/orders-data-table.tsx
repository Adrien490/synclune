import { OrderStatus, PaymentStatus, type FulfillmentStatus } from "@/app/generated/prisma/client";
import { CursorPagination } from "@/shared/components/cursor-pagination";
import {
	BulkSelectionHeaderCheckbox,
	BulkSelectionProvider,
	BulkSelectionRowCheckbox,
	TableEmptyState,
} from "@/shared/components/data-table";
import { TableScrollContainer } from "@/shared/components/table-scroll-container";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent } from "@/shared/components/ui/card";
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
import type { GetOrdersReturn } from "@/modules/orders/types/order.types";
import { formatEuro } from "@/shared/utils/format-euro";
import { formatDateShort } from "@/shared/utils/dates";
import { Button } from "@/shared/components/ui/button";
import {
	Clock,
	PackageCheck,
	PackageOpen,
	ShoppingBag,
	Truck,
	XCircle,
	type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { OrderRowActions } from "./order-row-actions";
import { OrdersBulkActionsBar } from "./orders-bulk-actions-bar";

const ORDER_STATUS_ICONS: Record<OrderStatus, LucideIcon> = {
	PENDING: Clock,
	PROCESSING: PackageOpen,
	SHIPPED: Truck,
	DELIVERED: PackageCheck,
	CANCELLED: XCircle,
};

interface OrdersDataTableProps {
	ordersPromise: Promise<GetOrdersReturn>;
	perPage: number;
}

export async function OrdersDataTable({ ordersPromise, perPage }: OrdersDataTableProps) {
	const { orders, pagination } = await ordersPromise;

	if (orders.length === 0) {
		return (
			<TableEmptyState
				className="hidden md:flex"
				icon={ShoppingBag}
				title="Aucune commande trouvée"
				description="Aucune commande ne correspond aux critères de recherche."
				actionElement={
					<Button variant="outline" asChild>
						<Link href="/admin/ventes/commandes">Réinitialiser les filtres</Link>
					</Button>
				}
			/>
		);
	}

	// Seules les commandes PENDING non payées sont éligibles au bulk-cancel
	const pageItemIds = orders
		.filter((o) => o.status === OrderStatus.PENDING && o.paymentStatus === PaymentStatus.PENDING)
		.map((o) => o.id);

	return (
		<Card className="hidden md:block">
			<CardContent>
				<BulkSelectionProvider pageItemIds={pageItemIds}>
					<OrdersBulkActionsBar />
					<TableScrollContainer>
						<Table
							caption="Liste des commandes"
							striped
							noRegion
							className="min-w-full table-fixed [&>caption]:sr-only"
						>
							<TableHeader>
								<TableRow>
									<TableHead className="w-[4%]">
										<BulkSelectionHeaderCheckbox itemsLabel="commandes éligibles" />
										<span className="sr-only">Sélection</span>
									</TableHead>
									<TableHead className="w-[12%]">Commande</TableHead>
									<TableHead className="w-[18%]">Client</TableHead>
									<TableHead className="w-[12%]">Date</TableHead>
									<TableHead className="w-[13%]">Statut</TableHead>
									<TableHead className="w-[12%] text-right">Montant</TableHead>
									<TableHead
										className="w-[8%] text-right"
										aria-label="Actions disponibles pour chaque commande"
									>
										Actions
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{orders.map((order) => {
									const userName = order.user?.name ?? order.user?.email ?? "Invité";
									const isCancelable =
										order.status === OrderStatus.PENDING &&
										order.paymentStatus === PaymentStatus.PENDING;

									return (
										<TableRow key={order.id}>
											<TableCell>
												{isCancelable ? (
													<BulkSelectionRowCheckbox
														id={order.id}
														itemLabel={`Commande ${order.orderNumber}`}
													/>
												) : (
													<span
														className="text-muted-foreground inline-flex size-4 items-center justify-center text-xs"
														aria-label="Commande non annulable en lot"
														title="Déjà payée ou expédiée — annuler individuellement"
													>
														—
													</span>
												)}
											</TableCell>
											<TableCell>
												<Link
													href={`/admin/ventes/commandes/${order.id}`}
													className="text-foreground text-sm font-medium tabular-nums underline"
													aria-label={`Voir commande ${order.orderNumber}`}
												>
													{order.orderNumber}
												</Link>
											</TableCell>
											<TableCell>
												<span className="block truncate text-sm font-medium">{userName}</span>
											</TableCell>
											<TableCell className="text-muted-foreground text-sm">
												<time dateTime={new Date(order.createdAt).toISOString()}>
													{formatDateShort(order.createdAt)}
												</time>
											</TableCell>
											<TableCell>
												{(() => {
													const status = order.status as OrderStatus;
													const label = ORDER_STATUS_LABELS[status];
													const Icon = ORDER_STATUS_ICONS[status];
													return (
														<Badge
															variant={ORDER_STATUS_VARIANTS[status]}
															role="status"
															aria-label={`Statut : ${label}`}
														>
															<Icon aria-hidden="true" />
															{label}
														</Badge>
													);
												})()}
											</TableCell>
											<TableCell className="text-right">
												<span className="text-sm font-bold">{formatEuro(order.total)}</span>
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
														invoiceNumber: order.invoiceNumber,
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
				</BulkSelectionProvider>
			</CardContent>
		</Card>
	);
}
