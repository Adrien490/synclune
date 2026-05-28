"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface PendingPaymentWatcherProps {
	orderId: string;
	orderNumber: string;
}

interface StatusPayload {
	paymentStatus: string;
	status: string;
}

const POLL_INTERVAL_MS = 3_000;
const TIMEOUT_MS = 30_000;

/**
 * CHECKOUT-AUDIT-004 — Polls `/api/orders/[orderNumber]/status` while the
 * order is still PENDING server-side, then either:
 * - `router.refresh()` on bascule PAID (so the server component re-renders
 *   the full confirmation UI), or
 * - `router.replace('/paiement/annulation?...')` on FAILED/CANCELLED, or
 * - after `TIMEOUT_MS`, fall back to the "we'll email you" message (no
 *   redirect — SEPA / async payment legit).
 *
 * Visibility-API aware: pauses polling when the tab is hidden so a backgrounded
 * user doesn't burn 60 req/min for nothing.
 */
export function PendingPaymentWatcher({ orderId, orderNumber }: PendingPaymentWatcherProps) {
	const router = useRouter();
	const [timedOut, setTimedOut] = useState(false);
	const cancelledRef = useRef(false);

	useEffect(() => {
		cancelledRef.current = false;
		const startedAt = Date.now();
		let timer: ReturnType<typeof setTimeout> | null = null;

		async function poll() {
			if (cancelledRef.current) return;

			if (document.visibilityState === "hidden") {
				timer = setTimeout(poll, POLL_INTERVAL_MS);
				return;
			}

			try {
				const res = await fetch(
					`/api/orders/${encodeURIComponent(orderNumber)}/status?orderId=${encodeURIComponent(orderId)}`,
					{ cache: "no-store" },
				);

				if (!res.ok) {
					// 404/500 — silently retry until timeout
					if (Date.now() - startedAt > TIMEOUT_MS) {
						setTimedOut(true);
						return;
					}
					timer = setTimeout(poll, POLL_INTERVAL_MS);
					return;
				}

				const data = (await res.json()) as StatusPayload;

				if (data.paymentStatus === "PAID") {
					router.refresh();
					return;
				}

				if (data.paymentStatus === "FAILED" || data.status === "CANCELLED") {
					router.replace(
						`/paiement/annulation?order_id=${encodeURIComponent(orderId)}&order_number=${encodeURIComponent(orderNumber)}&reason=payment_failed`,
					);
					return;
				}

				if (Date.now() - startedAt > TIMEOUT_MS) {
					setTimedOut(true);
					return;
				}

				timer = setTimeout(poll, POLL_INTERVAL_MS);
			} catch {
				if (Date.now() - startedAt > TIMEOUT_MS) {
					setTimedOut(true);
					return;
				}
				timer = setTimeout(poll, POLL_INTERVAL_MS);
			}
		}

		timer = setTimeout(poll, POLL_INTERVAL_MS);

		return () => {
			cancelledRef.current = true;
			if (timer) clearTimeout(timer);
		};
	}, [orderId, orderNumber, router]);

	if (!timedOut) return null;

	return (
		<p className="text-muted-foreground mt-3 text-xs">
			Le paiement prend plus de temps que prévu. Tu recevras un email de confirmation dès qu&apos;il
			sera validé.
		</p>
	);
}
