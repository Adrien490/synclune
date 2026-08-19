import { ArrowSquareOutIcon, WarningIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";

import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Separator } from "@/shared/components/ui/separator";
import { formatCountryName } from "@/shared/constants/countries";
import { formatEuro } from "@/shared/utils/format-euro";
import { formatDateTime } from "@/shared/utils/dates";

import type { AdminOrderDetail } from "../../data/get-order";
import { detectCarrierAndUrl } from "../../services/carrier-detection.service";
import { isUnshippableFrenchAddress } from "../../services/shipping.service";
import { orderDisplayLabel } from "../../utils/order-display";
import { OrderDetailActions } from "./order-detail-actions";
import { OrderStatusBadge } from "./order-status-badge";

/**
 * Détail admin d'une commande — SNAPSHOTS UNIQUEMENT.
 *
 * Les montants et libellés viennent des colonnes figées au checkout
 * (`nameSnapshot`, `variantSnapshot`, `unitPriceCents`) : on ne re-joint
 * JAMAIS le produit vivant pour afficher un nom ou un montant. Les FK
 * (`productId` via `product.slug`) ne servent qu'aux liens de navigation —
 * nullables (SetNull), le lien disparaît si le produit a été supprimé.
 */
export function OrderDetail({ order }: { order: AdminOrderDetail }) {
	const label = orderDisplayLabel(order);
	const tracking = order.trackingNumber ? detectCarrierAndUrl(order.trackingNumber) : null;
	// Au checkout hébergé, le CP n'est connu qu'APRÈS le paiement : l'exclusion
	// Corse/DOM-TOM des CGV §5.1 ne peut pas bloquer en amont, c'est Léane qui
	// arbitre — cette alerte est ce qui déclenche l'arbitrage (avant elle, une
	// commande hors zone s'affichait comme les autres).
	const unshippableAddress = isUnshippableFrenchAddress(order.shippingCountry, order.shippingZip);

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<div className="flex items-center gap-3">
					<OrderStatusBadge status={order.status} />
					<span className="text-muted-foreground text-sm">
						Passée le {formatDateTime(order.createdAt)}
					</span>
				</div>
				<OrderDetailActions orderId={order.id} orderLabel={label} status={order.status} />
			</div>

			{unshippableAddress && (
				<Alert variant="destructive">
					<WarningIcon aria-hidden="true" />
					<AlertTitle>Adresse hors zone de livraison</AlertTitle>
					<AlertDescription>
						Le code postal {order.shippingZip} est en Corse ou DOM-TOM — hors zone CGV (§ 5.1). À
						toi d&apos;arbitrer : expédier quand même, ou contacter la cliente et rembourser.
					</AlertDescription>
				</Alert>
			)}

			<div className="grid gap-6 lg:grid-cols-3">
				<Card className="lg:col-span-2">
					<CardHeader>
						<CardTitle>Articles</CardTitle>
					</CardHeader>
					<CardContent>
						<ul className="divide-border divide-y">
							{order.items.map((item) => (
								<li key={item.id} className="flex items-start justify-between gap-4 py-3">
									<div className="min-w-0">
										{item.product?.slug ? (
											<Link
												href={`/admin/catalogue/produits/${item.product.slug}`}
												className="hover:text-primary focus-visible:ring-ring rounded-md font-medium transition-colors outline-none focus-visible:ring-2"
											>
												{item.nameSnapshot}
											</Link>
										) : (
											<span className="font-medium">{item.nameSnapshot}</span>
										)}
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
								<dt>Total TTC</dt>
								<dd className="font-medium">{formatEuro(order.amountTotalCents)}</dd>
							</div>
						</dl>
					</CardContent>
				</Card>

				<div className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle>Cliente</CardTitle>
						</CardHeader>
						<CardContent className="space-y-1 text-sm">
							{order.customerName && <p className="font-medium">{order.customerName}</p>}
							<p className="text-muted-foreground break-all">{order.email || "—"}</p>
							{order.shippingLine1 ? (
								<address className="text-muted-foreground pt-2 not-italic">
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
							) : (
								<p className="text-muted-foreground pt-2">
									Adresse collectée par Stripe au paiement — pas encore disponible.
								</p>
							)}
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Expédition</CardTitle>
						</CardHeader>
						<CardContent className="space-y-1 text-sm">
							{order.shippedAt && tracking ? (
								<>
									<p>Expédiée le {formatDateTime(order.shippedAt)}</p>
									<p className="text-muted-foreground">
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
											order.trackingNumber
										)}
									</p>
								</>
							) : (
								<p className="text-muted-foreground">Pas encore expédiée.</p>
							)}
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Facturation</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2 text-sm">
							{order.invoiceNumber != null ? (
								<>
									<p>
										Facture <span className="font-medium">n° {order.invoiceNumber}</span>
									</p>
									<Link
										href={`/suivi-commande/facture?commande=${order.id}`}
										target="_blank"
										className="hover:text-primary focus-visible:ring-ring inline-flex items-center gap-1 rounded-md underline outline-none focus-visible:ring-2"
									>
										Voir la facture
										<ArrowSquareOutIcon aria-hidden="true" className="size-4" />
									</Link>
								</>
							) : (
								<p className="text-muted-foreground">
									Le numéro de facture est attribué au paiement.
								</p>
							)}
							{order.stripePaymentIntentId && (
								<p className="text-muted-foreground text-xs break-all">
									Stripe : {order.stripePaymentIntentId}
								</p>
							)}
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
