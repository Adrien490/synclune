import { Toolbar } from "@/shared/components/toolbar";
import { PageHeader } from "@/shared/components/page-header";
import { SearchInput } from "@/shared/components/search-input";
import { SelectFilter } from "@/shared/components/select-filter";
import { getOrders } from "@/modules/orders/data/get-orders";
import { SORT_LABELS as ORDERS_SORT_LABELS } from "@/modules/orders/constants/order.constants";
import { parseOrderParams } from "@/modules/orders/utils/parse-order-params";
// ROADMAP: Invoices - add ExportInvoicesButton
import { connection } from "next/server";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import { OrdersDataTable } from "@/modules/orders/components/admin/orders-data-table";
import { OrdersDataTableSkeleton } from "@/modules/orders/components/admin/orders-data-table-skeleton";
import { OrdersFilterBadges } from "@/modules/orders/components/admin/orders-filter-badges";
import { OrdersFilterSheet } from "@/modules/orders/components/admin/orders-filter-sheet";
import { RefreshOrdersButton } from "@/modules/orders/components/admin/refresh-orders-button";
import { parseFilters } from "./_utils/params";
import { Metadata } from "next";

// Lazy loading - dialogs charges uniquement a l'ouverture
const CancelOrderAlertDialog = dynamic(
	() => import("@/modules/orders/components/admin/cancel-order-alert-dialog").then((mod) => mod.CancelOrderAlertDialog)
);
const DeleteOrderAlertDialog = dynamic(
	() => import("@/modules/orders/components/admin/delete-order-alert-dialog").then((mod) => mod.DeleteOrderAlertDialog)
);
const BulkDeleteOrdersAlertDialog = dynamic(
	() => import("@/modules/orders/components/admin/bulk-delete-orders-alert-dialog").then((mod) => mod.BulkDeleteOrdersAlertDialog)
);
const MarkAsPaidAlertDialog = dynamic(
	() => import("@/modules/orders/components/admin/mark-as-paid-alert-dialog").then((mod) => mod.MarkAsPaidAlertDialog)
);
const MarkAsShippedDialog = dynamic(
	() => import("@/modules/orders/components/admin/mark-as-shipped-dialog").then((mod) => mod.MarkAsShippedDialog)
);
const MarkAsDeliveredAlertDialog = dynamic(
	() => import("@/modules/orders/components/admin/mark-as-delivered-alert-dialog").then((mod) => mod.MarkAsDeliveredAlertDialog)
);
const MarkAsProcessingAlertDialog = dynamic(
	() => import("@/modules/orders/components/admin/mark-as-processing-alert-dialog").then((mod) => mod.MarkAsProcessingAlertDialog)
);
const RevertToProcessingDialog = dynamic(
	() => import("@/modules/orders/components/admin/revert-to-processing-dialog").then((mod) => mod.RevertToProcessingDialog)
);
const MarkAsReturnedAlertDialog = dynamic(
	() => import("@/modules/orders/components/admin/mark-as-returned-alert-dialog").then((mod) => mod.MarkAsReturnedAlertDialog)
);
const OrderNotesDialog = dynamic(
	() => import("@/modules/orders/components/admin/order-notes-dialog").then((mod) => mod.OrderNotesDialog)
);

export type OrderFiltersSearchParams = {
	filter_status?: string;
	filter_paymentStatus?: string;
	filter_totalMin?: string;
	filter_totalMax?: string;
	filter_createdAfter?: string;
	filter_createdBefore?: string;
	filter_showDeleted?: string;
	sortBy?: string;
};

export type OrdersSearchParams = {
	cursor?: string;
	direction?: "forward" | "backward";
	perPage?: string;
	search?: string;
} & OrderFiltersSearchParams;

export const metadata: Metadata = {
	title: "Commandes - Administration",
	description: "Gérer les commandes du site",
};

type OrdersAdminPageProps = {
	searchParams: Promise<OrdersSearchParams>;
};

export default async function OrdersAdminPage({
	searchParams,
}: OrdersAdminPageProps) {
	// Force dynamic rendering to enable use cache: remote in functions
	await connection();

	const params = await searchParams;

	// Parse and validate all search parameters safely
	const { cursor, direction, perPage, sortBy, search } =
		parseOrderParams(params);

	// La promise de commandes n'est PAS awaitée pour permettre le streaming
	const ordersPromise = getOrders({
		cursor,
		direction,
		perPage,
		sortBy,
		search,
		filters: parseFilters(params),
	});

	return (
		<>
			<PageHeader
				variant="compact"
				title="Commandes"
			/>

			<div className="space-y-6">
				<Toolbar
					ariaLabel="Barre d'outils de gestion des commandes"
					search={
						<SearchInput mode="live" size="sm"
							paramName="search"
							placeholder="Rechercher par numéro, email, nom client, Payment Intent..."
							ariaLabel="Rechercher une commande par numéro, email client ou Payment Intent"
							className="w-full"
						/>
					}
				>
					<SelectFilter
						filterKey="sortBy"
						label="Trier par"
						options={Object.entries(ORDERS_SORT_LABELS).map(([value, label]) => ({
							value,
							label,
						}))}
						placeholder="Plus récentes"
						className="w-full sm:min-w-45"
						noPrefix
					/>
					<OrdersFilterSheet />
					{/* ROADMAP: Invoices - ExportInvoicesButton goes here */}
					<RefreshOrdersButton />
				</Toolbar>

				{/* Badges de filtres actifs */}
				<OrdersFilterBadges />

				<Suspense fallback={<OrdersDataTableSkeleton />}>
					<OrdersDataTable ordersPromise={ordersPromise} perPage={perPage} />
				</Suspense>
			</div>

			{/* Alert Dialogs globaux */}
			<CancelOrderAlertDialog />
			<DeleteOrderAlertDialog />
			<BulkDeleteOrdersAlertDialog />
			<MarkAsPaidAlertDialog />
			<MarkAsShippedDialog />
			<MarkAsDeliveredAlertDialog />
			<MarkAsProcessingAlertDialog />
			<RevertToProcessingDialog />
			<MarkAsReturnedAlertDialog />
			<OrderNotesDialog />
		</>
	);
}
