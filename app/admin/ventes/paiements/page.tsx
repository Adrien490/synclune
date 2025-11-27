import { PaymentStatus } from "@/app/generated/prisma/client";
import { PageHeader } from "@/shared/components/page-header";
import { fetchStripePayments } from "@/modules/payments/data/get-stripe-payments";
import { connection } from "next/server";
import { Suspense } from "react";
import { StripePaymentsDataTable } from "@/modules/payments/components/admin/stripe-payments-data-table";
import { Metadata } from "next";

export const metadata: Metadata = {
	title: "Paiements - Administration",
	description: "Gestion des paiements",
};

interface StripePaymentsPageProps {
	searchParams: Promise<{
		cursor?: string;
		direction?: string;
		search?: string;
		paymentStatus?: PaymentStatus;
		dateFrom?: string;
		dateTo?: string;
		paymentMethod?: string;
		hasStripePaymentIntent?: string;
		sortBy?: string;
	}>;
}

export default async function StripePaymentsPage({
	searchParams,
}: StripePaymentsPageProps) {
	// Force dynamic rendering to enable use cache: remote in functions
	await connection();

	const params = await searchParams;
	const cursor = params.cursor;
	const direction = (params.direction || "forward") as "forward" | "backward";
	const search = params.search;
	const sortBy = params.sortBy || "paidAt-descending";

	const filters = {
		...(params.paymentStatus && { paymentStatus: params.paymentStatus }),
		...(params.dateFrom && { dateFrom: new Date(params.dateFrom) }),
		...(params.dateTo && { dateTo: new Date(params.dateTo) }),
		...(params.paymentMethod && { paymentMethod: params.paymentMethod }),
		...(params.hasStripePaymentIntent && {
			hasStripePaymentIntent: params.hasStripePaymentIntent === "true",
		}),
	};

	const paymentsPromise = fetchStripePayments({
		cursor,
		direction,
		perPage: 25,
		search,
		sortBy,
		filters,
	});

	return (
		<>
			<PageHeader variant="compact"
				title="Paiements"
				description="Gestion et suivi des paiements"
			/>

			<Suspense fallback={<div>Chargement...</div>}>
				<StripePaymentsDataTable paymentsPromise={paymentsPromise} />
			</Suspense>
		</>
	);
}
