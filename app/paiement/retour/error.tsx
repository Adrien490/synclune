"use client";

import { NotFoundContent } from "@/app/_components/not-found-content";
import { Button } from "@/shared/components/ui/button";
import { BRAND } from "@/shared/constants/brand";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { CopyButton } from "@/shared/components/copy-button";
import * as Sentry from "@sentry/nextjs";
import { CircleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function CheckoutReturnError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	const router = useRouter();

	useEffect(() => {
		Sentry.addBreadcrumb({
			category: "checkout",
			message: "return-error-boundary-triggered",
			level: "warning",
			data: { digest: error.digest },
		});
		Sentry.captureException(error, {
			level: "warning",
			tags: {
				surface: "paiement-retour",
				digest: error.digest ?? "unknown",
			},
		});
	}, [error]);

	return (
		<main className="from-background via-primary/5 to-secondary/10 relative flex min-h-[60dvh] items-start justify-center bg-linear-to-br px-4 pt-12 md:items-center md:pt-24">
			<div className="relative z-10 mx-auto max-w-2xl space-y-8 text-center">
				<NotFoundContent
					emoji={
						<CircleAlert
							className="text-muted-foreground/50 mx-auto mb-4 size-20"
							aria-hidden="true"
						/>
					}
					title={
						<>
							<p aria-hidden="true" className="font-cursive text-muted-foreground mb-1 text-lg">
								Vérification interrompue —
							</p>
							<h1 className="font-display text-foreground text-3xl font-normal md:text-4xl">
								Impossible de vérifier ton paiement
							</h1>
						</>
					}
					description={
						<p className="text-muted-foreground text-lg md:text-xl">
							Si ta carte a été débitée, ta commande est en cours de traitement et tu recevras un
							email de confirmation. Tu peux aussi relancer la vérification.
						</p>
					}
					actions={
						<div className="space-y-4">
							<div className="flex flex-col justify-center gap-4 sm:flex-row">
								<Button
									size="lg"
									onClick={() => {
										triggerHaptic("medium");
										router.refresh();
										reset();
									}}
								>
									Vérifier le statut de ma commande
								</Button>
								<Button
									asChild
									variant="secondary"
									size="lg"
									onClick={() => triggerHaptic("light")}
								>
									<Link href="/commandes">Voir mes commandes</Link>
								</Button>
							</div>
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
		</main>
	);
}
