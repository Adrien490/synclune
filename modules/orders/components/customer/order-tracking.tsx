import { Button } from "@/shared/components/ui/button";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { estimateDeliveryDate } from "@/modules/orders/services/shipping.service";
import { ArrowSquareOutIcon } from "@phosphor-icons/react/ssr";
import { getCarrierLabel, type Carrier } from "@/modules/orders/utils/carrier.utils";
import { getShippingRate } from "@/modules/orders/services/shipping.service";
import { PREPARATION_DELAY_LABEL } from "@/modules/orders/constants/shipping-rates";

interface OrderTrackingProps {
	order: {
		status: string;
		paymentStatus: string;
		shippingCountry: string;
		trackingNumber: string | null;
		trackingUrl: string | null;
		shippingCarrier: string | null;
		shippedAt: Date | null;
		actualDelivery: Date | null;
	};
}

export function OrderTracking({ order }: OrderTrackingProps) {
	if (!order.trackingNumber) {
		// Entre le paiement et l'expédition — précisément la période où le client
		// se demande « quand ? » — la section rendait `null` : aucune information
		// de délai sur la seule surface client (audit 2026-08-01). On affiche la
		// promesse dérivée des SSOT (PREPARATION_BUSINESS_DAYS + SHIPPING_RATES),
		// les mêmes que la fiche produit (DeliveryEstimator).
		const awaitingShipment =
			(order.status === "PROCESSING" || order.status === "PENDING") &&
			(order.paymentStatus === "PAID" || order.paymentStatus === "PARTIALLY_REFUNDED");
		if (!awaitingShipment) {
			return null;
		}

		const transitDays = getShippingRate(order.shippingCountry).estimatedDays;
		return (
			<section className="space-y-4">
				<h2 className="text-base font-semibold">Suivi de livraison</h2>
				<div className="border-border/60 border-t pt-4">
					<p className="text-muted-foreground text-sm">
						Ta commande est préparée à l&apos;atelier sous {PREPARATION_DELAY_LABEL}. Dès son
						expédition, tu recevras un email avec le numéro de suivi — compte ensuite {transitDays}{" "}
						de livraison.
					</p>
				</div>
			</section>
		);
	}

	return (
		<section className="space-y-4">
			<h2 className="text-base font-semibold">Suivi de livraison</h2>
			<div className="border-border/60 space-y-4 border-t pt-4">
				{/* Carrier & Tracking */}
				<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
					{order.shippingCarrier && (
						<span className="text-sm font-medium">
							{getCarrierLabel(order.shippingCarrier as Carrier)}
						</span>
					)}
					<div className="flex items-center gap-2">
						<span className="text-muted-foreground text-sm">N° de suivi :</span>
						<code className="bg-muted rounded px-2 py-1 font-mono text-sm">
							{order.trackingNumber}
						</code>
					</div>
				</div>

				{/* Dates */}
				<div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
					{order.shippedAt && (
						<div>
							<span className="text-muted-foreground">Expédié le : </span>
							<span className="font-medium">
								{format(order.shippedAt, "d MMMM yyyy", { locale: fr })}
							</span>
						</div>
					)}
					{order.shippedAt && !order.actualDelivery && (
						<div>
							<span className="text-muted-foreground">Livraison estimée : </span>
							<span className="font-medium">
								{format(
									estimateDeliveryDate(order.shippedAt, order.shippingCountry),
									"d MMMM yyyy",
									{ locale: fr },
								)}
							</span>
						</div>
					)}
					{order.actualDelivery && (
						<div>
							<span className="text-muted-foreground">Livré le : </span>
							<span className="text-success font-medium">
								{format(order.actualDelivery, "d MMMM yyyy", { locale: fr })}
							</span>
						</div>
					)}
				</div>

				{/* Track button */}
				{order.trackingUrl && (
					<Button
						variant="outline"
						className="w-full sm:w-auto"
						render={
							<a
								href={order.trackingUrl}
								target="_blank"
								rel="noopener noreferrer"
								aria-label="Suivre mon colis (s'ouvre dans un nouvel onglet)"
							/>
						}
					>
						<ArrowSquareOutIcon className="mr-2 size-4" />
						Suivre mon colis
					</Button>
				)}
			</div>
		</section>
	);
}
