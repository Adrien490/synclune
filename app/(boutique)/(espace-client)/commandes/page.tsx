import { CustomerOrdersTable } from "@/modules/orders/components/customer/customer-orders-table";
import { CustomerOrdersTableSkeleton } from "@/modules/orders/components/customer/customer-orders-table-skeleton";
import { getUserOrders } from "@/modules/orders/data/get-user-orders";
import { searchParamParsers } from "@/shared/utils/parse-search-params";
import {
	GET_USER_ORDERS_DEFAULT_PER_PAGE,
	GET_USER_ORDERS_MAX_RESULTS_PER_PAGE,
} from "@/modules/orders/constants/user-orders.constants";
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
	}>;
};

function parseParams(params: { cursor?: string; direction?: string; perPage?: string }) {
	return {
		cursor: searchParamParsers.cursor(params.cursor),
		direction: searchParamParsers.direction(params.direction),
		perPage: searchParamParsers.perPage(
			params.perPage,
			GET_USER_ORDERS_DEFAULT_PER_PAGE,
			GET_USER_ORDERS_MAX_RESULTS_PER_PAGE,
		),
	};
}

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
	const params = await searchParams;
	const { cursor, direction, perPage } = parseParams(params);

	const ordersPromise = getUserOrders({
		cursor,
		direction,
		perPage,
	});

	return (
		<>
			<Suspense fallback={<CustomerOrdersTableSkeleton />}>
				<CustomerOrdersTable ordersPromise={ordersPromise} perPage={perPage} />
			</Suspense>
		</>
	);
}
