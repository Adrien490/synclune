import { SortSelect } from "@/shared/components/sort-select";
import { PageHeader } from "@/shared/components/page-header";
import { ACCOUNT_SECTION_PADDING } from "@/shared/constants/spacing";
import { AccountNav } from "@/modules/users/components/account-nav";
import {
	CustomerOrdersTable,
	CustomerOrdersTableSkeleton,
} from "@/modules/orders/components/customer";
import { getUserOrders } from "@/modules/orders/data/get-user-orders";
import { USER_ORDERS_SORT_LABELS } from "@/modules/orders/constants/user-orders.constants";
import { searchParamParsers } from "@/shared/utils/parse-search-params";
import { Suspense } from "react";
import type { Metadata } from "next";

type CustomerOrdersSearchParams = {
	cursor?: string;
	direction?: string;
	perPage?: string;
	sortBy?: string;
	filter_status?: string;
	filter_fulfillmentStatus?: string;
};

export const metadata: Metadata = {
	title: "Mes commandes - Synclune",
	description: "Consultez l'historique de toutes vos commandes Synclune.",
	robots: {
		index: false,
		follow: true,
	},
};

type CustomerOrdersPageProps = {
	searchParams: Promise<CustomerOrdersSearchParams>;
};

const SORT_FIELDS = [
	"created-descending",
	"created-ascending",
	"total-descending",
	"total-ascending",
] as const;

function parseParams(params: CustomerOrdersSearchParams) {
	return {
		cursor: searchParamParsers.cursor(params.cursor),
		direction: searchParamParsers.direction(params.direction),
		perPage: searchParamParsers.perPage(params.perPage, 10, 50),
		sortBy: searchParamParsers.sortBy(
			params.sortBy,
			SORT_FIELDS,
			"created-descending"
		) as (typeof SORT_FIELDS)[number],
	};
}

export default async function CustomerOrdersPage({
	searchParams,
}: CustomerOrdersPageProps) {
	const params = await searchParams;
	const { cursor, direction, perPage, sortBy } = parseParams(params);

	const ordersPromise = getUserOrders({
		cursor,
		direction,
		perPage,
		sortBy,
	});

	return (
		<div className="min-h-screen">
			<PageHeader
				title="Mes commandes"
				description="Retrouvez l'historique de toutes vos commandes"
				breadcrumbs={[
					{ label: "Mon compte", href: "/compte" },
					{ label: "Commandes", href: "/commandes" },
				]}
				action={
					<SortSelect
						label="Trier par"
						options={Object.entries(USER_ORDERS_SORT_LABELS).map(
							([value, label]) => ({
								value,
								label,
							})
						)}
						placeholder="Plus récentes"
						className="w-full sm:w-[200px]"
					/>
				}
			/>

			<section className={`bg-background ${ACCOUNT_SECTION_PADDING}`}>
				<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex gap-8">
						{/* Sidebar desktop */}
						<AccountNav variant="desktop-only" />

						{/* Contenu principal */}
						<div className="flex-1 min-w-0">
							<Suspense fallback={<CustomerOrdersTableSkeleton />}>
								<CustomerOrdersTable ordersPromise={ordersPromise} />
							</Suspense>
						</div>
					</div>
				</div>
			</section>
		</div>
	);
}
