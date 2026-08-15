import { type Metadata } from "next";
import { Suspense } from "react";
import dynamic from "next/dynamic";

import { assertAdminPage } from "@/modules/admin-auth/lib/assert-admin-page";
import { getOrders } from "@/modules/orders/data/get-orders";
import {
	GET_ORDERS_DEFAULT_SORT_BY,
	ORDER_STATUSES,
	ORDER_STATUS_LABELS,
	ORDERS_SORT_LABELS,
} from "@/modules/orders/constants/order.constants";
import { OrdersDataTable } from "@/modules/orders/components/admin/orders-data-table";
import { OrdersMobileList } from "@/modules/orders/components/admin/orders-mobile-list";
import { ExportOrdersButton } from "@/modules/orders/components/admin/export-orders-button";
import { ReconcilePendingOrdersButton } from "@/modules/orders/components/reconcile-pending-orders-button";

import { DataTableSkeleton } from "@/shared/components/data-table";
import { PageHeader } from "@/shared/components/page-header";
import { ResultCountLiveRegion } from "@/shared/components/result-count-live-region";
import { SearchInput } from "@/shared/components/search-input";
import { SelectFilter } from "@/shared/components/select-filter";
import { Toolbar } from "@/shared/components/toolbar";
import { ToolbarSkeleton } from "@/shared/components/toolbar-skeleton";
import { ADMIN_LIST_GROUP_CLASS } from "@/shared/components/admin-list-pending.styles";
import { DEFAULT_PER_PAGE } from "@/shared/lib/pagination";
import { cn } from "@/shared/utils/cn";
import { getAllParamsIn, getFirstParam } from "@/shared/utils/params";
import { searchParamParsers } from "@/shared/utils/parse-search-params";

// Dialogs chargés à l'ouverture uniquement.
const MarkOrderAsShippedDialog = dynamic(() =>
	import("@/modules/orders/components/admin/mark-order-as-shipped-dialog").then(
		(mod) => mod.MarkOrderAsShippedDialog,
	),
);
const UpdateTrackingNumberDialog = dynamic(() =>
	import("@/modules/orders/components/admin/update-tracking-number-dialog").then(
		(mod) => mod.UpdateTrackingNumberDialog,
	),
);
const CancelOrderAlertDialog = dynamic(() =>
	import("@/modules/orders/components/admin/cancel-order-alert-dialog").then(
		(mod) => mod.CancelOrderAlertDialog,
	),
);

export type OrdersSearchParams = {
	cursor?: string;
	direction?: "forward" | "backward";
	perPage?: string;
	sortBy?: string;
	search?: string;
	filter_status?: string | string[];
};

export const metadata: Metadata = {
	title: "Commandes - Administration",
	description: "Gérer les commandes",
};

export default async function AdminOrdersPage({
	searchParams,
}: {
	searchParams: Promise<OrdersSearchParams>;
}) {
	await assertAdminPage();

	const params = await searchParams;

	const cursor = getFirstParam(params.cursor);
	const direction = (getFirstParam(params.direction) ?? "forward") as "forward" | "backward";
	const perPage = Number(getFirstParam(params.perPage)) || DEFAULT_PER_PAGE;
	const sortBy = (getFirstParam(params.sortBy) ?? GET_ORDERS_DEFAULT_SORT_BY) as
		"created-descending" | "created-ascending";
	const search = searchParamParsers.search(params.search);
	// `getAllParamsIn` : un `?filter_status=BOGUS` retombe sur « pas de filtre »
	// au lieu de faire 500 via l'error boundary.
	const statusFilter = getAllParamsIn(params.filter_status, ORDER_STATUSES) ?? [];

	const hasActiveFilters = !!search || Object.keys(params).some((key) => key.startsWith("filter_"));

	const ordersPromise = getOrders({
		cursor,
		direction,
		perPage,
		sortBy,
		search,
		filters: statusFilter.length > 0 ? { status: statusFilter } : undefined,
	});

	return (
		<>
			<MarkOrderAsShippedDialog />
			<UpdateTrackingNumberDialog />
			<CancelOrderAlertDialog />

			<PageHeader
				variant="compact"
				title="Commandes"
				actions={
					<div className="flex items-center gap-2">
						<ReconcilePendingOrdersButton />
						<ExportOrdersButton />
					</div>
				}
				className="hidden md:block"
			/>

			<div className={cn(ADMIN_LIST_GROUP_CLASS, "space-y-6")}>
				<Suspense fallback={null}>
					<ResultCountLiveRegion
						totalCount={ordersPromise.then((data) => data.totalCount)}
						query={search}
						singular="commande"
						plural="commandes"
					/>
				</Suspense>

				<Suspense
					fallback={<ToolbarSkeleton selectCount={2} buttonCount={0} className="hidden md:flex" />}
				>
					<Toolbar
						className="hidden md:flex"
						ariaLabel="Barre d'outils de gestion des commandes"
						search={
							<SearchInput
								size="sm"
								paramName="search"
								placeholder="Rechercher par email, numéro de facture…"
								aria-label="Rechercher une commande par email ou numéro de facture"
								className="w-full"
							/>
						}
					>
						<SelectFilter
							filterKey="status"
							label="Statut"
							options={ORDER_STATUSES.map((status) => ({
								value: status,
								label: ORDER_STATUS_LABELS[status],
							}))}
							placeholder="Tous les statuts"
							className="w-full sm:min-w-45"
						/>
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
					</Toolbar>
				</Suspense>

				{/* Liste mobile */}
				<Suspense fallback={null}>
					<OrdersMobileList
						ordersPromise={ordersPromise}
						perPage={perPage}
						hasActiveFilters={hasActiveFilters}
					/>
				</Suspense>

				{/* DataTable desktop */}
				<Suspense
					fallback={
						<DataTableSkeleton
							className="hidden md:block"
							columns={[
								{ cell: { type: "text", width: "w-16" } },
								{ cell: { type: "text", width: "w-20" } },
								{ cell: { type: "text", width: "w-40" } },
								{ align: "center", cell: { type: "text", width: "w-8" } },
								{ align: "right", cell: { type: "text", width: "w-16" } },
								{ cell: { type: "badge", width: "w-28" } },
								{ align: "right", cell: { type: "actions" } },
							]}
						/>
					}
				>
					<OrdersDataTable
						ordersPromise={ordersPromise}
						perPage={perPage}
						hasActiveFilters={hasActiveFilters}
					/>
				</Suspense>
			</div>
		</>
	);
}
