import { Toolbar } from "@/shared/components/toolbar";
import { PageHeader } from "@/shared/components/page-header";
import { SearchInput } from "@/shared/components/search-input";
import { SelectFilter } from "@/shared/components/select-filter";
import { getRefunds, SORT_LABELS } from "@/modules/refunds/data/get-refunds";
import { connection } from "next/server";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import { AlertDialogSkeleton } from "@/shared/components/skeletons/lazy-loading";
import { RefundsDataTable } from "@/modules/refunds/components/admin/refunds-data-table";
import { RefundsDataTableSkeleton } from "@/modules/refunds/components/admin/refunds-data-table-skeleton";
import { RefreshRefundsButton } from "@/modules/refunds/components/admin/refresh-refunds-button";
import { parseRefundParams, parseRefundFilters } from "./_utils/params";
import type { Metadata } from "next";

// Lazy loading - dialogs charges uniquement a l'ouverture
const ApproveRefundAlertDialog = dynamic(
	() => import("@/modules/refunds/components/admin/approve-refund-alert-dialog").then((mod) => mod.ApproveRefundAlertDialog),
	{ loading: () => <AlertDialogSkeleton /> }
);
const ProcessRefundAlertDialog = dynamic(
	() => import("@/modules/refunds/components/admin/process-refund-alert-dialog").then((mod) => mod.ProcessRefundAlertDialog),
	{ loading: () => <AlertDialogSkeleton /> }
);
const RejectRefundAlertDialog = dynamic(
	() => import("@/modules/refunds/components/admin/reject-refund-alert-dialog").then((mod) => mod.RejectRefundAlertDialog),
	{ loading: () => <AlertDialogSkeleton /> }
);
const CancelRefundAlertDialog = dynamic(
	() => import("@/modules/refunds/components/admin/cancel-refund-alert-dialog").then((mod) => mod.CancelRefundAlertDialog),
	{ loading: () => <AlertDialogSkeleton /> }
);

export type RefundFiltersSearchParams = {
	filter_status?: string;
	filter_reason?: string;
	filter_createdAfter?: string;
	filter_createdBefore?: string;
};

export type RefundsSearchParams = {
	cursor?: string;
	direction?: "forward" | "backward";
	perPage?: string;
	sortBy?: string;
	search?: string;
} & RefundFiltersSearchParams;

export const metadata: Metadata = {
	title: "Remboursements - Administration",
	description: "Gérer les remboursements du site",
};

type RefundsAdminPageProps = {
	searchParams: Promise<RefundsSearchParams>;
};

export default async function RefundsAdminPage({
	searchParams,
}: RefundsAdminPageProps) {
	await connection();

	const params = await searchParams;

	const { cursor, direction, perPage, sortBy, search } =
		parseRefundParams(params);

	// La promise de remboursements n'est PAS awaitée pour permettre le streaming
	const refundsPromise = getRefunds({
		cursor,
		direction,
		perPage,
		sortBy,
		search,
		filters: parseRefundFilters(params),
	});

	return (
		<>
			<PageHeader
				variant="compact"
				title="Remboursements"
			/>

			<div className="space-y-6">
				<Toolbar
					ariaLabel="Barre d'outils de gestion des remboursements"
					search={
						<SearchInput mode="live" size="sm"
							paramName="search"
							placeholder="Rechercher par numéro de commande, email client..."
							ariaLabel="Rechercher un remboursement"
							className="w-full"
						/>
					}
				>
					<SelectFilter
						filterKey="sortBy"
						label="Trier par"
						options={Object.entries(SORT_LABELS).map(([value, label]) => ({
							value,
							label,
						}))}
						placeholder="Plus récents"
						className="w-full sm:min-w-[180px]"
						noPrefix
					/>
					<RefreshRefundsButton />
				</Toolbar>

				<Suspense fallback={<RefundsDataTableSkeleton />}>
					<RefundsDataTable refundsPromise={refundsPromise} perPage={perPage} />
				</Suspense>
			</div>

			{/* Alert Dialogs globaux */}
			<ApproveRefundAlertDialog />
			<ProcessRefundAlertDialog />
			<RejectRefundAlertDialog />
			<CancelRefundAlertDialog />
		</>
	);
}
