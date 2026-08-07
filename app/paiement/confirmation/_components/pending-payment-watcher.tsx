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
 *   redirect — en card-only, un PI 3DS lent peut rester PENDING quelques instants
 *   le temps du settlement ; le webhook finalisera).
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

	/*
	 * ⚠️ Ce composant rendait `null` pendant TOUTE la phase de vérification.
	 *
	 * Le sondage dure jusqu'à 30 s, au terme desquelles il peut `router.refresh()`
	 * (la page se réécrit sous l'utilisateur) ou `router.replace()` vers
	 * /annulation (changement de route depuis un timer). Rien n'était annoncé :
	 * un lecteur d'écran n'avait aucun signal qu'une vérification était en cours,
	 * puis la page changeait sans préavis.
	 *
	 * La région est montée EN PERMANENCE et ne change que son texte : une région
	 * live créée avec son contenu n'est pas fiablement annoncée.
	 *
	 * `aria-live="polite"` sans `role="status"` : le conteneur est déjà une
	 * `<Alert role="alert">` (`confirmation/page.tsx`), un rôle imbriqué de plus
	 * ferait doublon.
	 */
	return (
		<p
			aria-live="polite"
			aria-atomic="true"
			className={timedOut ? "text-muted-foreground mt-3 text-xs" : "sr-only"}
		>
			{timedOut
				? "Le paiement prend plus de temps que prévu. Tu recevras un email de confirmation dès qu'il sera validé."
				: "Vérification du paiement en cours…"}
		</p>
	);
}
