"use client";

import { useEffect, useRef } from "react";

import { FUNNEL_EVENTS, trackEvent } from "@/shared/lib/analytics/track";

interface ViewItemTrackerProps {
	productId: string;
	slug: string;
	priceCents: number;
	currency?: string;
}

/**
 * Fires `view_item` once when a PDP mounts.
 *
 * RGPD-gated by `trackEvent` (consent check). Dedup intra-mount via ref —
 * sessionStorage dedup would block legitimate re-views across tabs.
 */
export function ViewItemTracker({
	productId,
	slug,
	priceCents,
	currency = "EUR",
}: ViewItemTrackerProps) {
	const fired = useRef(false);

	useEffect(() => {
		if (fired.current) return;
		fired.current = true;
		trackEvent(FUNNEL_EVENTS.VIEW_ITEM, {
			productId,
			slug,
			value: priceCents / 100,
			currency,
		});
	}, [productId, slug, priceCents, currency]);

	return null;
}
