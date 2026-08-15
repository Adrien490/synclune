import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { isAdmin } from "@/modules/admin-auth/lib/require-admin";
import {
	getOrderForTracking,
	type OrderForTracking,
} from "@/modules/orders/data/get-order-for-tracking";
import { GET_ORDER_TRACKING_SELECT } from "@/modules/orders/constants/order.constants";
import { PrintButton } from "@/modules/orders/components/print-button";
import { formatCountryName } from "@/shared/constants/countries";
import { DEFAULT_FRANCHISE_VAT_MENTION } from "@/shared/constants/vat-franchise";
import { getInvoiceFooter, getVendorLegalInfo } from "@/shared/lib/stripe";
import { prisma } from "@/shared/lib/prisma";
import { formatEuro } from "@/shared/utils/format-euro";
import { formatDateLong } from "@/shared/utils/dates";

export const metadata: Metadata = {
	title: "Avoir | Synclune",
	robots: { index: false, follow: false },
};

/**
 * Avoir — rendu HTML imprimable (D2 : pas de PDF archivé, pas de hash).
 *
 * UNE ligne, au montant remboursé, avec la référence de la facture d'origine
 * (art. 272-I CGI : la référence et le montant, pas le détail des articles).
 * Le numéro vient du compteur séquentiel DISTINCT
 * `RetractationRequest.creditNoteNumber`. Accès : token de suivi ou session
 * admin — même modèle que la facture.
 */
export default async function AvoirPage({
	searchParams,
}: {
	searchParams: Promise<{ commande?: string; token?: string }>;
}) {
	const { commande, token } = await searchParams;
	if (!commande) notFound();

	let order: OrderForTracking | null = null;
	if (token) {
		order = await getOrderForTracking(commande, token);
	} else if (await isAdmin()) {
		order = await prisma.order.findUnique({
			where: { id: commande },
			select: GET_ORDER_TRACKING_SELECT,
		});
	}

	const retractation = order?.retractation;
	if (
		!order ||
		!retractation ||
		retractation.status !== "REFUNDED" ||
		retractation.creditNoteNumber == null ||
		!retractation.refundedAt
	) {
		notFound();
	}

	const vendor = getVendorLegalInfo();

	return (
		<main
			id="main-content"
			tabIndex={-1}
			className="min-h-dvh bg-white px-6 py-10 text-neutral-900 print:p-0"
		>
			<div className="mx-auto w-full max-w-2xl space-y-8">
				<div className="flex items-start justify-between gap-4">
					<div>
						<h1 className="text-2xl font-semibold">Avoir n° {retractation.creditNoteNumber}</h1>
						<p className="text-sm text-neutral-500">
							Date : {formatDateLong(retractation.refundedAt)}
						</p>
						{order.invoiceNumber != null && (
							<p className="text-sm text-neutral-500">
								Sur facture n° {order.invoiceNumber} du {formatDateLong(order.createdAt)}
							</p>
						)}
					</div>
					<PrintButton />
				</div>

				<div className="grid gap-6 text-sm sm:grid-cols-2">
					<div>
						<h2 className="mb-1 font-medium text-neutral-500">Vendeur</h2>
						<p className="font-medium">{vendor.company_trade_name}</p>
						<p>{vendor.company_legal_name}</p>
						<p>{vendor.company_address}</p>
						<p>SIREN : {vendor.company_siren}</p>
						<p>{vendor.company_email}</p>
					</div>
					<div>
						<h2 className="mb-1 font-medium text-neutral-500">Client</h2>
						{order.customerName && <p className="font-medium">{order.customerName}</p>}
						{order.shippingLine1 && (
							<>
								<p>{order.shippingLine1}</p>
								{order.shippingLine2 && <p>{order.shippingLine2}</p>}
								<p>
									{order.shippingZip} {order.shippingCity}
								</p>
								<p>{formatCountryName(order.shippingCountry)}</p>
							</>
						)}
						<p>{order.email}</p>
					</div>
				</div>

				<table className="w-full border-collapse text-sm">
					<thead>
						<tr className="border-b border-neutral-300 text-left text-neutral-500">
							<th className="py-2 font-medium">Désignation</th>
							<th className="py-2 text-right font-medium">Montant TTC</th>
						</tr>
					</thead>
					<tbody>
						<tr className="border-b border-neutral-200">
							<td className="py-2">
								Remboursement sur facture
								{order.invoiceNumber != null ? ` n° ${order.invoiceNumber}` : ""} (rétractation)
							</td>
							<td className="py-2 text-right">-{formatEuro(order.amountTotalCents)}</td>
						</tr>
						<tr className="border-t border-neutral-300">
							<td className="py-2 text-right font-medium">Total remboursé</td>
							<td className="py-2 text-right font-semibold">
								-{formatEuro(order.amountTotalCents)}
							</td>
						</tr>
					</tbody>
				</table>

				<p className="text-sm">{DEFAULT_FRANCHISE_VAT_MENTION}</p>

				<footer className="border-t border-neutral-200 pt-4 text-xs whitespace-pre-line text-neutral-500">
					{getInvoiceFooter()}
				</footer>
			</div>
		</main>
	);
}
