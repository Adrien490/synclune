"use client";

import { NotFoundContent } from "@/app/_components/not-found-content";
import { Button } from "@/shared/components/ui/button";
import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useEffect } from "react";

export default function AdminError({
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
		<main className="flex min-h-[60vh] items-center justify-center px-4">
			<div className="mx-auto max-w-2xl space-y-8 text-center">
				<NotFoundContent
					emoji={
						<p className="text-muted-foreground/30 text-8xl font-bold" aria-hidden="true">
							⚙️
						</p>
					}
					title={
						<h1 className="font-display text-foreground text-3xl font-normal md:text-4xl">
							Erreur dans l'administration
						</h1>
					}
					description={
						<p className="text-muted-foreground text-lg md:text-xl">
							Une erreur inattendue est survenue. L&apos;erreur a été signalée automatiquement.
						</p>
					}
					actions={
						<div className="flex flex-col justify-center gap-4 sm:flex-row">
							<Button size="lg" onClick={reset}>
								Réessayer
							</Button>
							<Button render={<Link href="/admin" />} variant="secondary" size="lg">
								Retour au tableau de bord
							</Button>
						</div>
					}
				/>
			</div>
		</main>
	);
}
