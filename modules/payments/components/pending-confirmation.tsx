"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const POLL_INTERVAL_MS = 3_000;
const MAX_POLLS = 20;

/**
 * Bloc « paiement en cours de confirmation » de la page de retour Checkout.
 *
 * Tant que le webhook `checkout.session.completed` n'est pas passé, la
 * commande est encore PENDING : on re-résout la page côté serveur toutes les
 * 3 s, au plus 20 fois. Au-delà, le texte bascule vers « vérifie tes emails » —
 * la promesse « cette page se met à jour automatiquement » cesse d'être
 * affichée au moment exact où elle cesse d'être vraie. Dans les deux causes
 * possibles (webhook en panne, Stripe en retard), l'email de confirmation
 * reste le canal fiable.
 *
 * Le composant PORTE le texte des deux états — un poller invisible qui
 * s'arrêterait en silence laisserait la page mentir (c'était le cas avant
 * l'audit du 2026-08-15).
 */
export function PendingConfirmation() {
	const router = useRouter();
	const [exhausted, setExhausted] = useState(false);

	useEffect(() => {
		let polls = 0;
		const interval = setInterval(() => {
			polls += 1;
			if (polls > MAX_POLLS) {
				clearInterval(interval);
				setExhausted(true);
				return;
			}
			router.refresh();
		}, POLL_INTERVAL_MS);
		return () => clearInterval(interval);
	}, [router]);

	return (
		<div className="space-y-6" aria-live="polite">
			{exhausted ? (
				<>
					<h1 className="font-display text-3xl font-normal tracking-tight">
						La confirmation prend plus de temps que prévu
					</h1>
					<p className="text-muted-foreground">
						Ton paiement a bien été transmis à Stripe. Vérifie tes emails : la confirmation arrive
						avec le récapitulatif de ta commande. Si tu ne reçois rien d&apos;ici une heure,
						écris-nous.
					</p>
				</>
			) : (
				<>
					<h1 className="font-display text-3xl font-normal tracking-tight">
						Paiement en cours de confirmation…
					</h1>
					<p className="text-muted-foreground">
						Stripe nous confirme ton paiement d&apos;une seconde à l&apos;autre. Cette page se met à
						jour automatiquement — tu recevras aussi un email de confirmation.
					</p>
				</>
			)}
		</div>
	);
}
