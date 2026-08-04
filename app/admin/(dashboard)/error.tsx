"use client";

import { Button } from "@/shared/components/ui/button";
import { ROUTES } from "@/shared/constants/urls";
import * as Sentry from "@sentry/nextjs";
import { ChartBarIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { useEffect } from "react";

/**
 * Frontière du tableau de bord.
 *
 * Boundary bespoke (pas `AdminListErrorBoundary`) car le tableau de bord n'a pas
 * de liste parente. Conséquence à ne pas reproduire : elle n'offrait que
 * `reset()`, donc aucune échappatoire quand l'erreur est déterministe — l'admin
 * restait bloqué sur `/admin`, qui EST cette page. Le lien de sortie va vers les
 * commandes, la surface la plus utile en cas de dashboard KO.
 */
export default function DashboardError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		Sentry.captureException(error, {
			tags: { route: "admin.dashboard", surface: "admin-dashboard" },
		});
	}, [error]);

	return (
		<div
			role="alert"
			className="flex min-h-[40dvh] flex-col items-center justify-center gap-4 text-center"
		>
			<ChartBarIcon className="text-muted-foreground/30 size-16" aria-hidden="true" />
			<h2 className="font-display text-foreground text-xl font-normal">
				Le tableau de bord n&apos;a pas pu charger
			</h2>
			<p className="text-muted-foreground max-w-md text-sm">
				Une erreur inattendue est survenue. L&apos;erreur a été signalée automatiquement.
			</p>
			<div className="flex flex-wrap items-center justify-center gap-2">
				<Button onClick={reset}>Réessayer</Button>
				<Button variant="outline" render={<Link href={ROUTES.ADMIN.ORDERS} />}>
					Voir les commandes
				</Button>
			</div>
		</div>
	);
}
