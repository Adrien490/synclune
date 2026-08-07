"use client";

import { NotFoundContent } from "@/app/_components/not-found-content";
import { CopyButton } from "@/shared/components/copy-button";
import { Button } from "@/shared/components/ui/button";
import { BRAND } from "@/shared/constants/brand";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import * as Sentry from "@sentry/nextjs";
import { WarningCircleIcon } from "@phosphor-icons/react/ssr";
import { useEffect } from "react";

/**
 * Frontière d'erreur propre à la confirmation de commande.
 *
 * Sans ce fichier, le segment héritait de `app/paiement/error.tsx`, dont la
 * copie affirme « Ta carte n'a pas été débitée » et propose « Réessayer le
 * paiement » — faux et dangereux ici : on est **après** l'encaissement, et
 * l'invitation pousse un client déjà débité à payer deux fois.
 *
 * La copie ne peut pas affirmer que le paiement est accepté : la page gère un
 * `showPendingState` (paiement asynchrone encore en vérification) et la
 * frontière peut se déclencher avant même la lecture de la commande. On reprend
 * donc la formulation conditionnelle déjà éprouvée dans
 * `app/paiement/retour/error.tsx` — vraie dans les deux branches.
 *
 * Pas de CTA vers `/commandes` en action principale : le checkout invité est un
 * chemin de premier ordre et cette route est derrière `protectedRoutes`, un
 * invité y trouverait un mur de connexion pour un compte qu'il n'a pas.
 */
export default function CheckoutConfirmationError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		Sentry.captureException(error, {
			level: "error",
			tags: {
				route: "paiement.confirmation",
				surface: "paiement-confirmation",
				digest: error.digest ?? "unknown",
			},
		});
	}, [error]);

	// `<div>`, pas `<main>` : le layout du segment en rend déjà un, et une frontière
	// d'erreur s'affiche à l'intérieur — deux landmarks `main` imbriqués.
	return (
		<div className="from-background via-primary/5 to-secondary/10 relative flex min-h-[60dvh] items-start justify-center bg-linear-to-br px-4 pt-12 md:items-center md:pt-24">
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
								Impossible d&apos;afficher ta confirmation
							</h1>
						</>
					}
					description={
						<p className="text-muted-foreground text-lg md:text-xl">
							C&apos;est l&apos;affichage de cette page qui a échoué, pas ta commande. Si ton
							paiement a été accepté, elle est bien enregistrée et tu recevras un email de
							confirmation.
						</p>
					}
					actions={
						<div className="space-y-4">
							<div className="flex flex-col justify-center gap-4 sm:flex-row">
								<Button
									size="lg"
									onClick={() => {
										triggerHaptic("medium");
										reset();
									}}
								>
									Réessayer
								</Button>
							</div>
							<p className="text-muted-foreground inline-flex flex-wrap items-center justify-center gap-x-1 text-sm">
								<span>Un doute sur ta commande ? Écris-moi :</span>
								<a
									href={`mailto:${BRAND.contact.email}`}
									className="text-foreground font-medium underline hover:no-underline"
								>
									{BRAND.contact.email}
								</a>
								<CopyButton text={BRAND.contact.email} label="Email" size="icon" />
							</p>
						</div>
					}
				/>
			</div>
		</div>
	);
}
