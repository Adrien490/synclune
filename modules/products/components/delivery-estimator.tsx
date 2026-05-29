import { SHIPPING_RATES } from "@/modules/orders/constants/shipping-rates";
import { parseEstimatedDays } from "@/modules/orders/services/shipping.service";
import { addBusinessDays, format } from "date-fns";
import { fr } from "date-fns/locale";
import { Truck } from "lucide-react";

/**
 * DeliveryEstimator - Estimated delivery date range on product page
 *
 * Calculates dynamic delivery dates based on preparation time + shipping time,
 * skipping weekends via date-fns addBusinessDays.
 * Proven conversion driver (Baymard: 64% look for delivery info before add-to-cart).
 */
export function DeliveryEstimator() {
	const now = new Date();

	// Preparation: 2-4 business days (from PRODUCT_TEXTS.SHIPPING.PREPARATION)
	const [prepMin, prepMax] = [2, 4];

	// Shipping: from SHIPPING_RATES (FR zone as default display)
	const [shipMin, shipMax] = parseEstimatedDays(SHIPPING_RATES.FR.estimatedDays);

	const minDate = addBusinessDays(now, prepMin + shipMin);
	const maxDate = addBusinessDays(now, prepMax + shipMax);

	const formatDeliveryDate = (date: Date) => format(date, "d MMMM", { locale: fr });

	return (
		<div className="text-muted-foreground flex items-center gap-2.5 text-sm">
			<Truck className="text-foreground size-4 shrink-0" aria-hidden="true" />
			<p>
				Livraison estimee entre le{" "}
				<span className="text-foreground font-medium">{formatDeliveryDate(minDate)}</span> et le{" "}
				<span className="text-foreground font-medium">{formatDeliveryDate(maxDate)}</span>
			</p>
		</div>
	);
}
