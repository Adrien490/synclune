import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getOrderForTracking } from "@/modules/orders/data/get-order-for-tracking";
import { RetractationSection } from "@/modules/retractations/components/retractation-section";
import { detectCarrierAndUrl } from "@/modules/orders/services/carrier-detection.service";
import {
	estimateDeliveryDate,
	isCountrySupported,
} from "@/modules/orders/services/shipping.service";
import { OrderStatusBadge } from "@/modules/orders/components/admin/order-status-badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Separator } from "@/shared/components/ui/separator";
import { formatCountryName } from "@/shared/constants/countries";
import { ROUTES } from "@/shared/constants/urls";
import { formatEuro } from "@/shared/utils/format-euro";
import { formatDateLong } from "@/shared/utils/dates";

export const metadata: Metadata = {
	title: "Suivi de commande | Synclune",
	robots: { index: false, follow: false },
};

const STATUS_MESSAGES: Record<string, string> = {
	PENDING: "Ton paiement est en cours de confirmation.",
	PAID: "Ta commande est confirmée — elle est en préparation à l'atelier.",
	SHIPPED: "Ta commande est en route !",
	REFUNDED: "Cette commande a été remboursée.",
	CANCELLED: "Cette commande a été annulée.",
};

/**
 * Suivi de commande invité — SEUL accès client à une commande (lot 4).
 *
 * L'accès passe par le lien tokenisé HMAC de l'email de confirmation
 * (`?commande=<id>&token=<hmac>`). Token invalide, commande inconnue :
 * même 404, sans distinguer les deux (anti-énumération).
 */
export default async function SuiviCommandePage({
	searchParams,
}: {
	searchParams: Promise<{ commande?: string; token?: string }>;
}) {
	const { commande, token } = await searchParams;

	// Arrivée sans lien (saisie manuelle de l'URL) : on explique, sans 404.
	if (!commande && !token) {
		return (
			<main className="bg-background flex min-h-dvh items-center justify-center px-4 py-12">
				<div className="w-full max-w-md space-y-6 text-center">
					<h1 className="font-display text-3xl font-normal tracking-tight">Suivi de commande</h1>
					<p className="text-muted-foreground">
						Pour suivre ta commande, ouvre le lien « Suivre ma commande » de ton email de
						confirmation — c&apos;est lui qui porte ta clé d&apos;accès.
					</p>
					<Button render={<Link href={ROUTES.SHOP.HOME} />} size="lg" variant="outline">
						Retour à la boutique
					</Button>
				</div>
			</main>
		);
	}

	const order = commande && token ? await getOrderForTracking(commande, token) : null;
	if (!order) notFound();

	const tracking = order.trackingNumber ? detectCarrierAndUrl(order.trackingNumber) : null;
	const estimatedDelivery =
		order.shippedAt && order.shippingCountry && isCountrySupported(order.shippingCountry)
			? formatDateLong(estimateDeliveryDate(order.shippedAt, order.shippingCountry))
			: null;

	return (
		<main className="bg-background min-h-dvh px-4 py-12">
			<div className="mx-auto w-full max-w-lg space-y-6">
				<div className="space-y-3 text-center">
					<h1 className="font-display text-3xl font-normal tracking-tight">
						{order.invoiceNumber != null ? `Commande n° ${order.invoiceNumber}` : "Ta commande"}
					</h1>
					<div className="flex justify-center">
						<OrderStatusBadge status={order.status} />
					</div>
					<p className="text-muted-foreground">{STATUS_MESSAGES[order.status]}</p>
				</div>

				{order.status === "SHIPPED" && tracking && (
					<Card>
						<CardHeader>
							<CardTitle>Ton colis</CardTitle>
						</CardHeader>
						<CardContent className="space-y-1 text-sm">
							<p>
								{tracking.label} —{" "}
								{tracking.url ? (
									<a
										href={tracking.url}
										target="_blank"
										rel="noopener noreferrer"
										className="hover:text-primary underline"
									>
										{order.trackingNumber}
									</a>
								) : (
									<span className="font-medium">{order.trackingNumber}</span>
								)}
							</p>
							{order.shippedAt && (
								<p className="text-muted-foreground">
									Expédiée le {formatDateLong(order.shippedAt)}
									{estimatedDelivery ? ` · livraison estimée le ${estimatedDelivery}` : ""}
								</p>
							)}
						</CardContent>
					</Card>
				)}

				<Card>
					<CardHeader>
						<CardTitle>Récapitulatif</CardTitle>
					</CardHeader>
					<CardContent>
						<ul className="divide-border divide-y">
							{order.items.map((item) => (
								<li key={item.id} className="flex items-start justify-between gap-4 py-3">
									<div className="min-w-0">
										<p className="font-medium">{item.nameSnapshot}</p>
										<p className="text-muted-foreground text-sm">
											{item.variantSnapshot ? `${item.variantSnapshot} · ` : ""}
											{item.quantity} × {formatEuro(item.unitPriceCents)}
										</p>
									</div>
									<span className="text-sm font-medium">
										{formatEuro(item.unitPriceCents * item.quantity)}
									</span>
								</li>
							))}
						</ul>

						<Separator className="my-4" />

						<dl className="space-y-2 text-sm">
							<div className="flex justify-between">
								<dt className="text-muted-foreground">Sous-total</dt>
								<dd className="font-medium">{formatEuro(order.amountItemsCents)}</dd>
							</div>
							<div className="flex justify-between">
								<dt className="text-muted-foreground">Livraison</dt>
								<dd className="font-medium">{formatEuro(order.amountShippingCents)}</dd>
							</div>
							<div className="flex justify-between">
								<dt>Total</dt>
								<dd className="font-semibold">{formatEuro(order.amountTotalCents)}</dd>
							</div>
						</dl>
					</CardContent>
				</Card>

				{order.shippingLine1 && (
					<Card>
						<CardHeader>
							<CardTitle>Adresse de livraison</CardTitle>
						</CardHeader>
						<CardContent className="text-sm">
							<address className="text-muted-foreground not-italic">
								{order.customerName && (
									<>
										<span className="text-foreground font-medium">{order.customerName}</span>
										<br />
									</>
								)}
								{order.shippingLine1}
								{order.shippingLine2 && (
									<>
										<br />
										{order.shippingLine2}
									</>
								)}
								<br />
								{order.shippingZip} {order.shippingCity}
								<br />
								{formatCountryName(order.shippingCountry)}
							</address>
						</CardContent>
					</Card>
				)}

				<RetractationSection order={order} token={token!} />

				<div className="space-y-3 text-center">
					{order.invoiceNumber != null && (
						<Button
							render={
								<Link
									href={`/suivi-commande/facture?commande=${order.id}&token=${token}`}
									target="_blank"
								/>
							}
							variant="outline"
						>
							Voir ma facture
						</Button>
					)}
					<p className="text-muted-foreground text-xs">
						Une question sur ta commande ? Réponds simplement à ton email de confirmation.
					</p>
				</div>
			</div>
		</main>
	);
}
