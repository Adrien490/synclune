"use client";

import { NotFoundContent } from "@/app/_components/not-found-content";
import { ParticleBackgroundError, RICH_ERROR_SHAPES } from "@/shared/components/animations";
import { Button } from "@/shared/components/ui/button";
import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useEffect } from "react";

export default function HomeError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		Sentry.captureException(error);
	}, [error]);

	return (
		<main className="from-background via-primary/5 to-secondary/10 relative flex min-h-[60vh] items-center justify-center bg-linear-to-br px-4">
			<ParticleBackgroundError count={6} shape={RICH_ERROR_SHAPES} />
			<div className="relative z-10 mx-auto max-w-2xl space-y-8 text-center">
				<NotFoundContent
					emoji={
						<p className="text-muted-foreground/30 mb-4 text-8xl font-bold" aria-hidden="true">
							😵‍💫
						</p>
					}
					title={
						<h1 className="font-display text-foreground text-3xl font-normal md:text-4xl">
							Oups, la page d&apos;accueil n&apos;a pas pu charger
						</h1>
					}
					description={
						<p className="text-muted-foreground text-lg md:text-xl">
							Une erreur inattendue est survenue. Pas de panique, mes créations sont toujours là !
						</p>
					}
					actions={
						<div className="flex flex-col justify-center gap-4 sm:flex-row">
							<Button size="lg" onClick={reset}>
								Réessayer
							</Button>
							<Button asChild variant="secondary" size="lg">
								<Link href="/produits">Voir la boutique</Link>
							</Button>
						</div>
					}
				/>
			</div>
		</main>
	);
}
