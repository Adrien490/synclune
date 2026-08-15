"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const POLL_INTERVAL_MS = 3_000;
const MAX_POLLS = 20;

/**
 * Tant que le webhook `checkout.session.completed` n'est pas passé, la
 * commande est encore PENDING : on re-résout la page côté serveur toutes les
 * 3 s (au plus 20 fois — au-delà, le message invite à vérifier ses emails).
 */
export function ConfirmationPoller() {
	const router = useRouter();

	useEffect(() => {
		let polls = 0;
		const interval = setInterval(() => {
			polls += 1;
			if (polls > MAX_POLLS) {
				clearInterval(interval);
				return;
			}
			router.refresh();
		}, POLL_INTERVAL_MS);
		return () => clearInterval(interval);
	}, [router]);

	return null;
}
