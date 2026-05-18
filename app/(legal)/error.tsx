"use client";

import { Button } from "@/shared/components/ui/button";
import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useEffect } from "react";

export default function LegalError({
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
			<div className="mx-auto max-w-lg space-y-6 text-center">
				<h1 className="font-display text-foreground text-2xl font-normal md:text-3xl">
					Page temporairement indisponible
				</h1>
				<p className="text-muted-foreground text-lg">
					Une erreur est survenue lors du chargement de cette page. Veuillez réessayer.
				</p>
				<div className="flex flex-col justify-center gap-4 sm:flex-row">
					<Button size="lg" onClick={reset}>
						Réessayer
					</Button>
					<Button asChild variant="secondary" size="lg">
						<Link href="/">Retour à l&apos;accueil</Link>
					</Button>
				</div>
			</div>
		</main>
	);
}
