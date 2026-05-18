"use client";

import { useEffect, useRef } from "react";

import { FUNNEL_EVENTS, trackEvent } from "@/shared/lib/analytics/track";

interface BeginCheckoutTrackerProps {
	cartId: string;
	itemCount: number;
	valueCents: number;
	currency?: string;
}

/**
 * Fires `begin_checkout` once when the checkout page mounts.
 *
 * Distinct event from `view_item` and `purchase` — captures the moment
 * the user lands on `/paiement` with a valid cart (validation passed).
 */
export function BeginCheckoutTracker({
	cartId,
	itemCount,
	valueCents,
	currency = "EUR",
}: BeginCheckoutTrackerProps) {
	const fired = useRef(false);

	useEffect(() => {
		if (fired.current) return;
		fired.current = true;
		trackEvent(FUNNEL_EVENTS.BEGIN_CHECKOUT, {
			cartId,
			itemCount,
			value: valueCents / 100,
			currency,
		});
	}, [cartId, itemCount, valueCents, currency]);

	return null;
}
