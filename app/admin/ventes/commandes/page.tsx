import { Toolbar } from "@/shared/components/toolbar";
import { ButtonGroup } from "@/shared/components/ui/button-group";
import { PageHeader } from "@/shared/components/page-header";
import { SearchInput } from "@/shared/components/search-input";
import { SelectFilter } from "@/shared/components/select-filter";
import { getOrders } from "@/modules/orders/data/get-orders";
import { SORT_LABELS as ORDERS_SORT_LABELS } from "@/modules/orders/constants/order.constants";
import { parseOrderParams } from "@/modules/orders/utils/parse-order-params";
import { ExportOrdersButton } from "@/modules/orders/components/admin/export-orders-button";
import { ADMIN_LIST_GROUP_CLASS } from "@/shared/components/admin-list-pending.styles";
import { cn } from "@/shared/utils/cn";
import { Suspense } from "react";
import dynamic from "next/dynamic";

import { OrdersAdminDialogs } from "./_components/orders-admin-dialogs";
import { OrdersDataTable } from "@/modules/orders/components/admin/orders-data-table";
import { OrdersDataTableSkeleton } from "@/modules/orders/components/admin/orders-data-table-skeleton";
import { OrdersFilterBadges } from "@/modules/orders/components/admin/orders-filter-badges";
import { OrdersFilterSheet } from "@/modules/orders/components/admin/orders-filter-sheet";
import { OrdersSortBadge } from "@/modules/orders/components/admin/orders-sort-badge";
import { RefreshOrdersButton } from "@/modules/orders/components/admin/refresh-orders-button";
import { OrdersMobileList } from "@/modules/orders/components/admin/orders-mobile-list";
import { OrdersMobileListSkeleton } from "@/modules/orders/components/admin/orders-mobile-list-skeleton";
import { parseFilters } from "./_utils/params";
import { ToolbarSkeleton } from "@/shared/components/toolbar-skeleton";
import { type Metadata } from "next";
import { ResultCountLiveRegion } from "@/shared/components/result-count-live-region";
import { assertAdminPage } from "@/modules/auth/lib/assert-admin-page";

const OrdersBottomBar = dynamic(() =>
	import("@/modules/orders/components/admin/orders-bottom-bar").then((mod) => mod.OrdersBottomBar),
);

export type OrderFiltersSearchParams = {
	// Les 4 filtres d'énumération sont MULTI-SÉLECTION : la feuille écrit un
	// `params.append()` par case cochée, donc l'URL peut porter plusieurs valeurs pour
	// la même clé (`string[]`). Les déclarer `string` laissait `parseFilters` lire, via
	// `getAllParams`, une forme que le type interdisait.
	filter_status?: string | string[];
	filter_paymentStatus?: string | string[];
	filter_fulfillmentStatus?: string | string[];
	filter_invoiceStatus?: string | string[];
	filter_invoiceAnomaly?: string;
	filter_pdfNotArchived?: string;
	filter_retryDeferred?: string;
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

export default async function OrdersAdminPage({ searchParams }: OrdersAdminPageProps) {
	await assertAdminPage();

	const params = await searchParams;

	// Parse and validate all search parameters safely
	const { cursor, direction, perPage, sortBy, search } = parseOrderParams(params);
	const filters = parseFilters(params);

	// La promise de commandes n'est PAS awaitée pour permettre le streaming
	const ordersPromise = getOrders({
		cursor,
		direction,
		perPage,
		sortBy,
		search,
		filters,
	});

	return (
		<>
			<PageHeader variant="compact" title="Commandes" className="hidden md:block" />

			<div className={cn(ADMIN_LIST_GROUP_CLASS, "space-y-6")}>
				<Suspense fallback={null}>
					<ResultCountLiveRegion
						totalCount={ordersPromise.then((d) => d.totalCount)}
						query={search}
						singular="commande"
						plural="commandes"
					/>
				</Suspense>

				<OrdersBottomBar />

				<Suspense
					fallback={<ToolbarSkeleton selectCount={1} buttonCount={3} className="hidden md:flex" />}
				>
					<Toolbar
						className="hidden md:flex"
						ariaLabel="Barre d'outils de gestion des commandes"
						search={
							<SearchInput
								size="sm"
								paramName="search"
								placeholder="Rechercher par numéro de commande, facture, avoir, email, client…"
								aria-label="Rechercher une commande par numéro, numéro de facture/avoir, email client ou Payment Intent"
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
						<ButtonGroup aria-label="Filtres et actions">
							<OrdersFilterSheet />
							<ExportOrdersButton />
							<RefreshOrdersButton />
						</ButtonGroup>
					</Toolbar>

					{/* Badges de filtres actifs (visible mobile + desktop) */}
					<OrdersFilterBadges />
				</Suspense>

				{/* Sort badge mobile (visible si sortBy URL défini) */}
				<OrdersSortBadge />

				{/* Liste mobile */}
				<Suspense
					fallback={
						<OrdersMobileListSkeleton
							hasActiveFilters={
								!!search || Object.keys(params).some((key) => key.startsWith("filter_"))
							}
						/>
					}
				>
					<OrdersMobileList
						ordersPromise={ordersPromise}
						perPage={perPage}
						hasActiveFilters={
							!!search || Object.keys(params).some((key) => key.startsWith("filter_"))
						}
					/>
				</Suspense>

				{/* DataTable desktop */}
				<Suspense fallback={<OrdersDataTableSkeleton />}>
					<OrdersDataTable
						ordersPromise={ordersPromise}
						perPage={perPage}
						hasActiveFilters={
							!!search || Object.keys(params).some((key) => key.startsWith("filter_"))
						}
					/>
				</Suspense>
			</div>

			{/* Dialogs des actions long-press / row-actions (cancel, delete, mark-as-*, notes) */}
			<OrdersAdminDialogs />
		</>
	);
}
