"use client";

import { NotFoundContent } from "@/app/_components/not-found-content";
import { Button } from "@/shared/components/ui/button";
import { BRAND } from "@/shared/constants/brand";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { CopyButton } from "@/shared/components/copy-button";
import * as Sentry from "@sentry/nextjs";
import { WarningCircleIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { useEffect } from "react";

export default function CheckoutError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		Sentry.addBreadcrumb({
			category: "checkout",
			message: "error-boundary-triggered",
			level: "error",
			data: { digest: error.digest },
		});
		Sentry.captureException(error);
	}, [error]);

	return (
		<main
			className="from-background via-primary/5 to-secondary/10 relative flex min-h-[60dvh] items-start justify-center bg-linear-to-br px-4 pt-12 md:min-h-[60vh] md:items-center md:pt-24"
			style={{ viewTransitionName: "shop-paiement" }}
		>
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
								Erreur lors du paiement
							</h1>
						</>
					}
					description={
						<p className="text-muted-foreground text-lg md:text-xl">
							Une erreur est survenue pendant le processus de paiement. Ta carte n&apos;a pas été
							débitée.
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
									Réessayer le paiement
								</Button>
								<Button
									render={<Link href="/produits" />}
									variant="secondary"
									size="lg"
									onClick={() => triggerHaptic("light")}
								>
									Continuer mes achats
								</Button>
							</div>
							<p className="text-muted-foreground inline-flex flex-wrap items-center justify-center gap-x-1 text-sm">
								<span>Si le problème persiste, écris-moi :</span>
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
		</main>
	);
}
