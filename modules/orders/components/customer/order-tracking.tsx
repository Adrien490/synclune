import { Button } from "@/shared/components/ui/button";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ExternalLink, Package, Truck } from "lucide-react";
import { getCarrierLabel, type Carrier } from "@/modules/orders/utils/carrier.utils";

interface OrderTrackingProps {
	order: {
		trackingNumber: string | null;
		trackingUrl: string | null;
		shippingCarrier: string | null;
		shippedAt: Date | null;
		estimatedDelivery: Date | null;
		actualDelivery: Date | null;
	};
}

export function OrderTracking({ order }: OrderTrackingProps) {
	if (!order.trackingNumber) {
		return null;
	}

	return (
		<section className="space-y-4">
			<h2 className="text-base font-semibold flex items-center gap-2">
				<Truck className="size-4 text-muted-foreground" />
				Suivi de livraison
			</h2>
			<div className="border-t border-border/60 pt-4 space-y-4">
				{/* Carrier & Tracking */}
				<div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
					{order.shippingCarrier && (
						<div className="flex items-center gap-2">
							<Package className="h-4 w-4 text-muted-foreground" />
							<span className="text-sm font-medium">
								{getCarrierLabel(order.shippingCarrier.toLowerCase() as Carrier)}
							</span>
						</div>
					)}
					<div className="flex items-center gap-2">
						<span className="text-sm text-muted-foreground">N° de suivi :</span>
						<code className="px-2 py-1 bg-muted rounded text-sm font-mono">
							{order.trackingNumber}
						</code>
					</div>
				</div>

				{/* Dates */}
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
					{order.shippedAt && (
						<div>
							<span className="text-muted-foreground">Expédié le : </span>
							<span className="font-medium">
								{format(order.shippedAt, "d MMMM yyyy", { locale: fr })}
							</span>
						</div>
					)}
					{order.estimatedDelivery && !order.actualDelivery && (
						<div>
							<span className="text-muted-foreground">Livraison prévue : </span>
							<span className="font-medium">
								{format(order.estimatedDelivery, "d MMMM yyyy", { locale: fr })}
							</span>
						</div>
					)}
					{order.actualDelivery && (
						<div>
							<span className="text-muted-foreground">Livré le : </span>
							<span className="font-medium text-green-600">
								{format(order.actualDelivery, "d MMMM yyyy", { locale: fr })}
							</span>
						</div>
					)}
				</div>

				{/* Track button */}
				{order.trackingUrl && (
					<Button variant="outline" className="w-full sm:w-auto" asChild>
						<a
							href={order.trackingUrl}
							target="_blank"
							rel="noopener noreferrer"
						>
							<ExternalLink className="h-4 w-4 mr-2" />
							Suivre mon colis
						</a>
					</Button>
				)}
			</div>
		</section>
	);
}
