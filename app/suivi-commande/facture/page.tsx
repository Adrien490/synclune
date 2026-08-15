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
	title: "Facture | Synclune",
	robots: { index: false, follow: false },
};

/**
 * Facture — rendu HTML imprimable (D2 : pas de PDF, pas d'archivage SHA-256).
 *
 * Reconstruite à CHAQUE affichage depuis les colonnes vivantes de l'Order
 * (snapshots figés au checkout + identité vendeur courante de l'env).
 * Accès : lien tokenisé HMAC de la cliente, ou session admin (le détail
 * commande y pointe sans token).
 *
 * ⚠️ Date de facture = `createdAt` de la commande — la date Stripe
 * d'encaissement n'est plus stockée, le paiement suit la création de
 * quelques minutes (session Checkout ~30 min max). Limite assumée, notée
 * aussi sur l'export CSV.
 */
export default async function FacturePage({
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

	// Une facture n'existe qu'à partir du paiement (numéro attribué au webhook).
	if (!order || order.invoiceNumber == null) notFound();

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
						<h1 className="text-2xl font-semibold">Facture n° {order.invoiceNumber}</h1>
						<p className="text-sm text-neutral-500">Date : {formatDateLong(order.createdAt)}</p>
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
						<h2 className="mb-1 font-medium text-neutral-500">Facturé à</h2>
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
							<th className="py-2 text-center font-medium">Qté</th>
							<th className="py-2 text-right font-medium">PU TTC</th>
							<th className="py-2 text-right font-medium">Total TTC</th>
						</tr>
					</thead>
					<tbody>
						{order.items.map((item) => (
							<tr key={item.id} className="border-b border-neutral-200">
								<td className="py-2">
									{item.nameSnapshot}
									{item.variantSnapshot && (
										<span className="text-neutral-500"> — {item.variantSnapshot}</span>
									)}
								</td>
								<td className="py-2 text-center">{item.quantity}</td>
								<td className="py-2 text-right">{formatEuro(item.unitPriceCents)}</td>
								<td className="py-2 text-right">
									{formatEuro(item.unitPriceCents * item.quantity)}
								</td>
							</tr>
						))}
						<tr>
							<td colSpan={3} className="py-2 text-right text-neutral-500">
								Sous-total
							</td>
							<td className="py-2 text-right">{formatEuro(order.amountItemsCents)}</td>
						</tr>
						<tr>
							<td colSpan={3} className="py-1 text-right text-neutral-500">
								Livraison
							</td>
							<td className="py-1 text-right">{formatEuro(order.amountShippingCents)}</td>
						</tr>
						<tr className="border-t border-neutral-300">
							<td colSpan={3} className="py-2 text-right font-medium">
								Total TTC
							</td>
							<td className="py-2 text-right font-semibold">
								{formatEuro(order.amountTotalCents)}
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
