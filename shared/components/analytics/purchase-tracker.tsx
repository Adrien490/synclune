"use client";

import { useEffect, useRef } from "react";

import { FUNNEL_EVENTS, trackEvent } from "@/shared/lib/analytics/track";

interface PurchaseTrackerProps {
	orderNumber: string;
	valueCents: number;
	currency?: string;
}

/**
 * Fires `purchase` once when the confirmation page mounts with a known order.
 *
 * Cross-mount dedup via `sessionStorage` keyed by `orderNumber` :
 * un refresh ou un retour navigateur ne re-déclenche pas l'événement
 * (Vercel Analytics ne déduplique pas côté serveur).
 */
export function PurchaseTracker({
	orderNumber,
	valueCents,
	currency = "EUR",
}: PurchaseTrackerProps) {
	const fired = useRef(false);

	useEffect(() => {
		if (fired.current) return;
		fired.current = true;

		const storageKey = `purchase_tracked_${orderNumber}`;
		try {
			if (window.sessionStorage.getItem(storageKey)) return;
			window.sessionStorage.setItem(storageKey, "1");
		} catch {
			// sessionStorage may be unavailable (private mode) — fall through and track anyway.
		}

		trackEvent(FUNNEL_EVENTS.PURCHASE, {
			orderNumber,
			value: valueCents / 100,
			currency,
		});
	}, [orderNumber, valueCents, currency]);

	return null;
}
