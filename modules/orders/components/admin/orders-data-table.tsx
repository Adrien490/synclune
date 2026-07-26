import {
	type OrderStatus,
	type PaymentStatus,
	type FulfillmentStatus,
} from "@/app/generated/prisma/client";
import { AdminDataTable, TableEmptyState } from "@/shared/components/data-table";
import { perPageOptionsUpTo } from "@/shared/lib/pagination";
import { GET_ORDERS_MAX_RESULTS_PER_PAGE } from "@/modules/orders/constants/order.constants";
import { Badge } from "@/shared/components/ui/badge";
import {
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/components/ui/table";
import {
	ORDER_STATUS_LABELS,
	ORDER_STATUS_VARIANTS,
	PAYMENT_STATUS_LABELS,
	PAYMENT_STATUS_VARIANTS,
} from "@/modules/orders/constants/status-display";
import type { GetOrdersReturn } from "@/modules/orders/types/order.types";
import { formatEuro } from "@/shared/utils/format-euro";
import { formatDateShort } from "@/shared/utils/dates";
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
	hasActiveFilters?: boolean;
}

export async function OrdersDataTable({
	ordersPromise,
	perPage,
	hasActiveFilters,
}: OrdersDataTableProps) {
	const { orders, pagination, totalCount } = await ordersPromise;

	if (orders.length === 0) {
		return (
			<TableEmptyState
				className="hidden md:flex"
				icon={ShoppingBag}
				title="Aucune commande trouvée"
				description="Aucune commande ne correspond aux critères de recherche."
				noItemsDescription="Aucune commande n'a encore été passée."
				hasActiveFilters={hasActiveFilters}
				resetFiltersHref="/admin/ventes/commandes"
			/>
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
				// Ce module plafonne sous MAX_ADMIN : ne pas proposer une valeur que le
				// schéma refuserait (sinon 20 lignes affichées avec « 200 » sélectionné).
				perPageOptions: perPageOptionsUpTo(GET_ORDERS_MAX_RESULTS_PER_PAGE),
			}}
		>
			<TableHeader>
				<TableRow>
					<TableHead className="w-[14%]">Commande</TableHead>
					<TableHead className="w-[22%]">Client</TableHead>
					<TableHead className="w-[12%]">Date</TableHead>
					<TableHead className="w-[14%]">Statut</TableHead>
					<TableHead className="w-[14%]">Paiement</TableHead>
					<TableHead className="w-[14%] text-right">Montant</TableHead>
					<TableHead
						className="w-[10%] text-right"
						aria-label="Actions disponibles pour chaque commande"
					>
						Actions
					</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{orders.map((order) => {
					const userName = order.user?.name ?? order.user?.email ?? "Invité";

					return (
						<TableRow key={order.id}>
							<TableCell>
								<Link
									href={`/admin/ventes/commandes/${order.id}`}
									className="text-foreground block truncate text-sm font-medium tabular-nums underline"
									aria-label={`Voir commande ${order.orderNumber}`}
									title={order.orderNumber}
								>
									{order.orderNumber}
								</Link>
							</TableCell>
							<TableCell>
								<span className="block truncate text-sm font-medium" title={userName}>
									{userName}
								</span>
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
							<TableCell>
								{(() => {
									const paymentStatus = order.paymentStatus as PaymentStatus;
									const label = PAYMENT_STATUS_LABELS[paymentStatus];
									return (
										<Badge
											variant={PAYMENT_STATUS_VARIANTS[paymentStatus]}
											role="status"
											aria-label={`Paiement : ${label}`}
										>
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
										invoiceStatus: order.invoiceStatus,
									}}
								/>
							</TableCell>
						</TableRow>
					);
				})}
			</TableBody>
		</AdminDataTable>
	);
}
