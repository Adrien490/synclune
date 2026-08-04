"use client";

import { NotFoundContent } from "@/app/_components/not-found-content";
import { Button } from "@/shared/components/ui/button";
import { BRAND } from "@/shared/constants/brand";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import * as Sentry from "@sentry/nextjs";
import { WarningCircleIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { useEffect } from "react";

/**
 * Frontière d'erreur propre à la page d'annulation.
 *
 * Sans ce fichier, le segment héritait de `app/paiement/error.tsx` et de son CTA
 * « Réessayer le paiement », qui relance un `reset()` de la frontière au lieu de
 * ramener au checkout — l'action utile ici est « Reprendre ma commande ».
 *
 * Aucune affirmation de débit dans la copie : la page elle-même nuance ce point
 * par motif (`payment_failed` peut résulter d'un débit suivi d'un remboursement
 * automatique, cf. 3DS-03 dans `annulation/page.tsx`), et la frontière n'a pas
 * accès de façon fiable à ce `reason`. Affirmer « aucun débit » serait le même
 * défaut que celui corrigé côté confirmation, en miroir.
 */
export default function CheckoutCancelError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		Sentry.captureException(error, {
			level: "warning",
			tags: {
				route: "paiement.annulation",
				surface: "paiement-annulation",
				digest: error.digest ?? "unknown",
			},
		});
	}, [error]);

	return (
		<main className="from-background via-primary/5 to-secondary/10 relative flex min-h-[60dvh] items-start justify-center bg-linear-to-br px-4 pt-12 md:items-center md:pt-24">
			<div className="relative z-10 mx-auto max-w-2xl space-y-8 text-center">
				<NotFoundContent
					emoji={
						<WarningCircleIcon
							className="text-muted-foreground/50 mx-auto mb-4 size-20"
							aria-hidden="true"
						/>
					}
					title={
						<>
							<p aria-hidden="true" className="font-cursive text-muted-foreground mb-1 text-lg">
								Petit imprévu —
							</p>
							<h1 className="font-display text-foreground text-3xl font-normal md:text-4xl">
								Cette page n&apos;a pas pu s&apos;afficher
							</h1>
						</>
					}
					description={
						<p className="text-muted-foreground text-lg md:text-xl">
							Ta commande n&apos;a pas été finalisée. Ton panier et tes informations ont été
							sauvegardés : tu peux reprendre où tu en étais.
						</p>
					}
					actions={
						<div className="space-y-4">
							<div className="flex flex-col justify-center gap-4 sm:flex-row">
								<Button
									render={<Link href="/paiement" />}
									size="lg"
									onClick={() => triggerHaptic("medium")}
								>
									Reprendre ma commande
								</Button>
								<Button
									variant="secondary"
									size="lg"
									onClick={() => {
										triggerHaptic("light");
										reset();
									}}
								>
									Réessayer
								</Button>
							</div>
							<p className="text-muted-foreground text-sm">
								Besoin d&apos;aide ?{" "}
								<a
									href={`mailto:${BRAND.contact.email}`}
									className="text-foreground font-medium underline hover:no-underline"
								>
									Écris-moi
								</a>
							</p>
						</div>
					}
				/>
			</div>
		</main>
	);
}
