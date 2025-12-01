import { Suspense } from "react";
import { connection } from "next/server";
import { Metadata } from "next";
import { DataTableToolbar } from "@/shared/components/data-table-toolbar";
import { PageHeader } from "@/shared/components/page-header";
import { SearchForm } from "@/shared/components/search-form";
import { SelectFilter } from "@/shared/components/select-filter";
import { getFirstParam } from "@/shared/utils/params";
import { StockNotificationStatus } from "@/app/generated/prisma/client";
import {
	getStockNotificationsAdmin,
	getStockNotificationsStats,
	STOCK_NOTIFICATIONS_SORT_OPTIONS,
} from "@/modules/stock-notifications/data/get-stock-notifications-admin";
import { StockNotificationsStatsCards } from "@/modules/stock-notifications/components/admin/stock-notifications-stats";
import {
	StockNotificationsDataTable,
	StockNotificationsDataTableSkeleton,
} from "@/modules/stock-notifications/components/admin/stock-notifications-data-table";
import { StockNotificationsFilterBadges } from "@/modules/stock-notifications/components/admin/stock-notifications-filter-badges";
import { CleanupExpiredButton } from "@/modules/stock-notifications/components/admin/cleanup-expired-button";
import { STOCK_NOTIFICATION_STATUS_LABELS } from "@/modules/stock-notifications/constants/stock-notification.constants";
import { SORT_OPTIONS_FOR_SELECT, DEFAULT_SORT } from "./_constants/sort-options";

export const metadata: Metadata = {
	title: "Alertes stock | Dashboard",
	description: "Gerez les demandes de notification de retour en stock",
};

interface NotificationsStockPageProps {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function NotificationsStockPage({
	searchParams,
}: NotificationsStockPageProps) {
	// Force dynamic rendering
	await connection();

	const params = await searchParams;

	// Parse search params
	const cursor = getFirstParam(params.cursor);
	const direction = (getFirstParam(params.direction) || "forward") as
		| "forward"
		| "backward";
	const sortByParam = getFirstParam(params.sortBy);
	const sortBy =
		sortByParam &&
		Object.values(STOCK_NOTIFICATIONS_SORT_OPTIONS).includes(
			sortByParam as (typeof STOCK_NOTIFICATIONS_SORT_OPTIONS)[keyof typeof STOCK_NOTIFICATIONS_SORT_OPTIONS]
		)
			? sortByParam
			: DEFAULT_SORT;
	const search = getFirstParam(params.search);
	const statusParam = getFirstParam(params.filter_status);
	const status =
		statusParam &&
		Object.values(StockNotificationStatus).includes(
			statusParam as StockNotificationStatus
		)
			? (statusParam as StockNotificationStatus)
			: undefined;

	// Fetch data
	const statsPromise = getStockNotificationsStats();
	const notificationsPromise = getStockNotificationsAdmin({
		cursor,
		direction,
		perPage: 50,
		sortBy,
		filters: {
			status,
			search,
		},
	});

	const stats = await statsPromise;

	// Options pour le filtre de statut
	const statusOptions = Object.entries(STOCK_NOTIFICATION_STATUS_LABELS).map(
		([value, label]) => ({
			value,
			label,
		})
	);

	return (
		<>
			<div className="flex items-center justify-between">
				<PageHeader
					variant="compact"
					title="Alertes stock"
				/>
				<CleanupExpiredButton />
			</div>

			{/* Statistiques */}
			<StockNotificationsStatsCards stats={stats} />

			{/* Toolbar */}
			<DataTableToolbar ariaLabel="Barre d'outils des alertes stock">
				<div className="flex-1 w-full sm:max-w-md min-w-0">
					<SearchForm
						paramName="search"
						placeholder="Rechercher un email ou produit..."
						ariaLabel="Rechercher une demande"
						className="w-full"
					/>
				</div>

				<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
					<SelectFilter
						filterKey="filter_status"
						label="Statut"
						options={statusOptions}
						placeholder="Tous les statuts"
						className="w-full sm:min-w-[160px]"
					/>

					<SelectFilter
						filterKey="sortBy"
						label="Trier par"
						options={SORT_OPTIONS_FOR_SELECT}
						placeholder="Date (recent)"
						className="w-full sm:min-w-[160px]"
					/>
				</div>
			</DataTableToolbar>

			{/* Badges de filtres actifs */}
			<StockNotificationsFilterBadges />

			{/* Table */}
			<Suspense fallback={<StockNotificationsDataTableSkeleton />}>
				<StockNotificationsDataTable
					notificationsPromise={notificationsPromise}
				/>
			</Suspense>
		</>
	);
}
