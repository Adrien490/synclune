"use client";

import { NotFoundContent } from "@/app/_components/not-found-content";
import { Button } from "@/shared/components/ui/button";
import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useEffect } from "react";

export default function FavorisError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		Sentry.captureException(error, {
			tags: {
				route: "favoris",
				surface: "wishlist",
				digest: error.digest ?? "unknown",
			},
		});
	}, [error]);

	return (
		<main className="from-background via-primary/5 to-secondary/10 relative flex min-h-[70dvh] items-center justify-center bg-linear-to-br px-4">
			<div className="relative z-10 mx-auto max-w-2xl space-y-8 text-center">
				<NotFoundContent
					emoji={
						<p className="text-8xl" aria-hidden="true">
							💔
						</p>
					}
					title={
						<h1 className="font-display text-foreground text-3xl font-normal md:text-4xl">
							Impossible de charger tes favoris
						</h1>
					}
					description={
						<p className="text-muted-foreground text-lg md:text-xl">
							Tes coups de cœur sont bien en sécurité. Réessaie dans un instant ou continue ta
							visite.
						</p>
					}
					actions={
						<div className="flex flex-col justify-center gap-4 sm:flex-row">
							<Button size="lg" onClick={reset}>
								Réessayer
							</Button>
							<Button render={<Link href="/produits" />} variant="secondary" size="lg">
								Voir toutes les créations
							</Button>
							<Button render={<Link href="/" />} variant="ghost" size="lg">
								Retour à l&apos;accueil
							</Button>
						</div>
					}
				/>
			</div>
		</main>
	);
}
