"use client";

import { PackageIcon } from "@phosphor-icons/react/ssr";
import type { ShippingRate } from "@/modules/orders/constants/shipping-rates";
import { formatEuro } from "@/shared/utils/format-euro";
import { SHIPPING_UNAVAILABLE } from "../constants/shipping-unavailable";

interface ShippingMethodSectionProps {
	shipping: number;
	shippingUnavailable: boolean;
	shippingInfo: ShippingRate | null;
}

/**
 * Displays the shipping method after address is filled.
 * Shows cost, carrier, and estimated delivery time.
 */
export function ShippingMethodSection({
	shipping,
	shippingUnavailable,
	shippingInfo,
}: ShippingMethodSectionProps) {
	if (shippingUnavailable) {
		return (
			<div className="border-destructive/20 bg-destructive/5 rounded-xl border p-4">
				<p className="text-destructive text-sm">
					{SHIPPING_UNAVAILABLE.section} {SHIPPING_UNAVAILABLE.contactCta}
				</p>
			</div>
		);
	}

	return (
		<div className="border-primary/10 bg-primary/5 flex items-center gap-3 rounded-xl border p-4">
			<PackageIcon className="text-muted-foreground size-5 shrink-0" />
			<div className="flex-1 text-sm">
				<div className="flex items-center justify-between">
					<span className="font-medium">{shippingInfo?.displayName ?? "Livraison standard"}</span>
					<span className="font-medium tabular-nums">{formatEuro(shipping)}</span>
				</div>
				{shippingInfo && (
					<p className="text-muted-foreground text-xs">{shippingInfo.estimatedDays}</p>
				)}
			</div>
		</div>
	);
}
