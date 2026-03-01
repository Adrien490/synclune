import { PageHeader } from "@/shared/components/page-header";
import { CustomerOrdersFilters } from "@/modules/orders/components/customer/customer-orders-filters";
import { CustomerOrdersTable } from "@/modules/orders/components/customer/customer-orders-table";
import { CustomerOrdersTableSkeleton } from "@/modules/orders/components/customer/customer-orders-table-skeleton";
import { getUserOrders } from "@/modules/orders/data/get-user-orders";
import { searchParamParsers } from "@/shared/utils/parse-search-params";
import {
	GET_USER_ORDERS_DEFAULT_PER_PAGE,
	GET_USER_ORDERS_MAX_RESULTS_PER_PAGE,
	GET_USER_ORDERS_SORT_FIELDS,
	USER_ORDERS_SORT_LABELS,
	USER_ORDERS_SORT_OPTIONS,
} from "@/modules/orders/constants/user-orders.constants";
import { SortSelect } from "@/shared/components/sort-select";
import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Mes commandes",
};

type OrdersPageProps = {
	searchParams: Promise<{
		cursor?: string;
		direction?: string;
		perPage?: string;
		sortBy?: string;
		search?: string;
	}>;
};

function parseParams(params: {
	cursor?: string;
	direction?: string;
	perPage?: string;
	sortBy?: string;
	search?: string;
}) {
	return {
		cursor: searchParamParsers.cursor(params.cursor),
		direction: searchParamParsers.direction(params.direction),
		perPage: searchParamParsers.perPage(
			params.perPage,
			GET_USER_ORDERS_DEFAULT_PER_PAGE,
			GET_USER_ORDERS_MAX_RESULTS_PER_PAGE,
		),
		sortBy: searchParamParsers.sortBy(
			params.sortBy,
			GET_USER_ORDERS_SORT_FIELDS,
			USER_ORDERS_SORT_OPTIONS.CREATED_DESC,
		),
		search: searchParamParsers.search(params.search, 50),
	};
}

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
	const params = await searchParams;
	const { cursor, direction, perPage, sortBy, search } = parseParams(params);

	const sortOptions = Object.values(USER_ORDERS_SORT_OPTIONS).map((value) => ({
		value,
		label: USER_ORDERS_SORT_LABELS[value],
	}));

	const ordersPromise = getUserOrders({
		cursor,
		direction,
		perPage,
		sortBy,
		search,
	});

	return (
		<>
			<PageHeader
				title="Mes commandes"
				description="Suivez l'état de vos commandes"
				variant="compact"
			/>

			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<CustomerOrdersFilters />
				<SortSelect label="Trier par" options={sortOptions} />
			</div>

			<Suspense fallback={<CustomerOrdersTableSkeleton />}>
				<CustomerOrdersTable ordersPromise={ordersPromise} perPage={perPage} />
			</Suspense>
		</>
	);
}
