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
 * Frontière d'erreur du suivi de commande invité.
 *
 * Le segment n'en avait aucune : avec son propre `layout.tsx`, toute exception
 * remontait jusqu'à `app/global-error.tsx` — coquille HTML blanche pleine page,
 * header et gradient perdus, sur la surface la plus anxiogène du parcours
 * (accès DB + token HMAC, atteinte depuis un email de confirmation).
 *
 * Pas de `<main>` ici : `layout.tsx` en fournit déjà un (`#main-content`).
 *
 * Pas de CTA vers `/commandes` : la page existe précisément parce que le client
 * peut être un invité sans compte (AUDIT-BIZ-001). Le seul recours universel est
 * de recharger le lien de suivi, puis le contact direct.
 */
export default function OrderTrackingError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		Sentry.captureException(error, {
			tags: {
				route: "suivi-commande",
				surface: "order-tracking",
				digest: error.digest ?? "unknown",
			},
		});
	}, [error]);

	return (
		<section className="flex min-h-[60dvh] items-center justify-center px-4 py-12">
			<div className="mx-auto max-w-2xl space-y-8 text-center">
				<NotFoundContent
					emoji={
						<WarningCircleIcon
							className="text-muted-foreground/50 mx-auto mb-4 size-20"
							aria-hidden="true"
						/>
					}
					title={
						<h1 className="font-display text-foreground text-3xl font-normal md:text-4xl">
							Impossible d&apos;afficher ton suivi
						</h1>
					}
					description={
						<p className="text-muted-foreground text-lg md:text-xl">
							Ta commande n&apos;est pas en cause : c&apos;est l&apos;affichage de cette page qui a
							échoué. Réessaie dans un instant — ton lien de suivi reste valable.
						</p>
					}
					actions={
						<div className="space-y-4">
							<Button
								size="lg"
								onClick={() => {
									triggerHaptic("medium");
									reset();
								}}
							>
								Réessayer
							</Button>
							<p className="text-muted-foreground inline-flex flex-wrap items-center justify-center gap-x-1 text-sm">
								<span>Besoin d&apos;aide ? Écris-moi :</span>
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
		</section>
	);
}
