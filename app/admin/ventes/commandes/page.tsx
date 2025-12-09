import { Toolbar } from "@/shared/components/toolbar";
import { PageHeader } from "@/shared/components/page-header";
import { SearchForm } from "@/shared/components/search-form";
import { SelectFilter } from "@/shared/components/select-filter";
import { getOrders } from "@/modules/orders/data/get-orders";
import { SORT_LABELS as ORDERS_SORT_LABELS } from "@/modules/orders/constants/order.constants";
import { parseOrderParams } from "@/modules/orders/utils/parse-order-params";
// TODO: Implémenter ExportInvoicesButton
// import { ExportInvoicesButton } from "@/modules/orders/components/admin/export-invoices-button";
import { connection } from "next/server";
import { Suspense } from "react";
import { OrdersDataTable } from "@/modules/orders/components/admin/orders-data-table";
import { OrdersDataTableSkeleton } from "@/modules/orders/components/admin/orders-data-table-skeleton";
import { OrdersFilterBadges } from "@/modules/orders/components/admin/orders-filter-badges";
import { OrdersFilterSheet } from "@/modules/orders/components/admin/orders-filter-sheet";
import { CancelOrderAlertDialog } from "@/modules/orders/components/admin/cancel-order-alert-dialog";
import { DeleteOrderAlertDialog } from "@/modules/orders/components/admin/delete-order-alert-dialog";
import { BulkDeleteOrdersAlertDialog } from "@/modules/orders/components/admin/bulk-delete-orders-alert-dialog";
import { MarkAsPaidAlertDialog } from "@/modules/orders/components/admin/mark-as-paid-alert-dialog";
import { MarkAsShippedDialog } from "@/modules/orders/components/admin/mark-as-shipped-dialog";
import { MarkAsDeliveredAlertDialog } from "@/modules/orders/components/admin/mark-as-delivered-alert-dialog";
import { MarkAsProcessingAlertDialog } from "@/modules/orders/components/admin/mark-as-processing-alert-dialog";
import { RevertToProcessingDialog } from "@/modules/orders/components/admin/revert-to-processing-dialog";
import { MarkAsReturnedAlertDialog } from "@/modules/orders/components/admin/mark-as-returned-alert-dialog";
import { OrderNotesDialog } from "@/modules/orders/components/admin/order-notes-dialog";
import { RefreshOrdersButton } from "@/modules/orders/components/admin/refresh-orders-button";
import { parseFilters } from "./_utils/params";
import { Metadata } from "next";

export type OrderFiltersSearchParams = {
	filter_status?: string;
	filter_paymentStatus?: string;
	filter_totalMin?: string;
	filter_totalMax?: string;
	filter_createdAfter?: string;
	filter_createdBefore?: string;
	filter_showDeleted?: string;
	filter_sortBy?: string;
};

export type OrdersSearchParams = {
	cursor?: string;
	direction?: "forward" | "backward";
	perPage?: string;
	sortBy?: string;
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
						<SearchForm
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
						className="w-full sm:min-w-[180px]"
					/>
					<OrdersFilterSheet />
					{/* TODO: Implémenter ExportInvoicesButton */}
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
