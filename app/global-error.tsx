"use client";

import { kalam, onest, winkySans } from "@/shared/styles/fonts";
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import "./globals.css";

export default function GlobalError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		const route = typeof window !== "undefined" ? window.location.pathname : "unknown";
		Sentry.captureException(error, {
			tags: { route, surface: "global-error", level: "critical" },
		});
	}, [error]);

	return (
		<html lang="fr" className={`${onest.variable} ${winkySans.variable} ${kalam.variable}`}>
			<body className={`${onest.className} antialiased`}>
				<main className="bg-background flex min-h-dvh items-center justify-center px-4">
					<div className="mx-auto max-w-2xl space-y-8 text-center">
						<p className="text-muted-foreground/30 text-8xl font-bold" aria-hidden="true">
							💔
						</p>
						<h1 className="font-display text-foreground text-3xl font-normal md:text-4xl">
							Une erreur critique est survenue
						</h1>
						<p className="text-muted-foreground text-lg md:text-xl">
							L&apos;application a rencontré un problème inattendu. L&apos;erreur a été signalée
							automatiquement.
						</p>
						<div className="flex flex-col justify-center gap-4 sm:flex-row">
							<button
								type="button"
								onClick={reset}
								className="focus-ring bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-11 items-center justify-center rounded-md px-8 text-sm font-medium transition-colors"
							>
								Réessayer
							</button>
							{/* eslint-disable-next-line @next/next/no-html-link-for-pages -- global-error renders outside the Next router context */}
							<a
								href="/"
								className="focus-ring border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex h-11 items-center justify-center rounded-md border px-8 text-sm font-medium transition-colors"
							>
								Retour à l&apos;accueil
							</a>
						</div>
					</div>
				</main>
			</body>
		</html>
	);
}
