import { DataTableToolbar } from "@/shared/components/toolbar";
import { PageHeader } from "@/shared/components/page-header";
import { SearchForm } from "@/shared/components/search-form";
import { SelectFilter } from "@/shared/components/select-filter";
import {
	getStripePayments,
	SORT_LABELS,
} from "@/modules/payments/data/get-stripe-payments";
import { connection } from "next/server";
import { Suspense } from "react";
import { StripePaymentsDataTable } from "@/modules/payments/components/admin/stripe-payments-data-table";
import { StripePaymentsDataTableSkeleton } from "@/modules/payments/components/admin/stripe-payments-data-table-skeleton";
import { RefreshPaymentsButton } from "@/modules/payments/components/admin/refresh-payments-button";
import type { Metadata } from "next";
import type { PaymentStatus } from "@/app/generated/prisma/client";
import { PAYMENT_STATUS_LABELS } from "@/modules/orders/constants/status-display";

export const metadata: Metadata = {
	title: "Paiements - Administration",
	description: "Consulter les paiements Stripe",
};

export type PaymentsSearchParams = {
	cursor?: string;
	direction?: "forward" | "backward";
	perPage?: string;
	sortBy?: string;
	search?: string;
	filter_paymentStatus?: string;
	filter_totalMin?: string;
	filter_totalMax?: string;
	filter_paidAfter?: string;
	filter_paidBefore?: string;
};

type PaymentsAdminPageProps = {
	searchParams: Promise<PaymentsSearchParams>;
};

function parsePaymentsParams(params: PaymentsSearchParams) {
	return {
		cursor: params.cursor,
		direction: params.direction as "forward" | "backward" | undefined,
		perPage: params.perPage ? parseInt(params.perPage, 10) : undefined,
		sortBy: params.sortBy,
		search: params.search,
		filters: {
			paymentStatus: params.filter_paymentStatus as PaymentStatus | undefined,
			totalMin: params.filter_totalMin
				? parseInt(params.filter_totalMin, 10)
				: undefined,
			totalMax: params.filter_totalMax
				? parseInt(params.filter_totalMax, 10)
				: undefined,
			paidAfter: params.filter_paidAfter
				? new Date(params.filter_paidAfter)
				: undefined,
			paidBefore: params.filter_paidBefore
				? new Date(params.filter_paidBefore)
				: undefined,
		},
	};
}

export default async function PaymentsAdminPage({
	searchParams,
}: PaymentsAdminPageProps) {
	await connection();

	const params = await searchParams;
	const { cursor, direction, perPage, sortBy, search, filters } =
		parsePaymentsParams(params);

	// La promise de paiements n'est PAS awaitée pour permettre le streaming
	const paymentsPromise = getStripePayments({
		cursor,
		direction,
		perPage,
		sortBy,
		search,
		...filters,
	});

	return (
		<>
			<PageHeader
				variant="compact"
				title="Paiements"
			/>

			<div className="space-y-6">
				<DataTableToolbar
					ariaLabel="Barre d'outils de consultation des paiements"
					search={
						<SearchForm
							paramName="search"
							placeholder="Rechercher par numéro, email, Payment Intent..."
							ariaLabel="Rechercher un paiement"
							className="w-full"
						/>
					}
				>
					<SelectFilter
						filterKey="filter_paymentStatus"
						label="Statut"
						options={Object.entries(PAYMENT_STATUS_LABELS).map(
							([value, label]) => ({
								value,
								label,
							})
						)}
						placeholder="Tous les statuts"
						className="w-full sm:min-w-[160px]"
					/>
					<SelectFilter
						filterKey="sortBy"
						label="Trier par"
						options={Object.entries(SORT_LABELS).map(([value, label]) => ({
							value,
							label,
						}))}
						placeholder="Plus récents"
						className="w-full sm:min-w-[180px]"
					/>
					<RefreshPaymentsButton />
				</DataTableToolbar>

				<Suspense fallback={<StripePaymentsDataTableSkeleton />}>
					<StripePaymentsDataTable paymentsPromise={paymentsPromise} />
				</Suspense>
			</div>
		</>
	);
}
