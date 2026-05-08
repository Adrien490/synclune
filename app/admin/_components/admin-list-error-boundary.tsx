"use client";

import { Button } from "@/shared/components/ui/button";
import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useEffect } from "react";

interface AdminListErrorBoundaryProps {
	error: Error & { digest?: string };
	reset: () => void;
	/** Emoji ou élément décoratif. Ex: "📦", "🎁". */
	emoji: string;
	/** Titre court. Ex: "Les produits n'ont pas pu charger". */
	title: string;
	/** Tag Sentry — chemin de la route. Ex: "admin.catalogue.produits". */
	route: string;
	/** Lien de repli. Default: /admin. */
	fallbackHref?: string;
	/** Libellé du lien de repli. Default: "Retour au tableau de bord". */
	fallbackLabel?: string;
}

export function AdminListErrorBoundary({
	error,
	reset,
	emoji,
	title,
	route,
	fallbackHref = "/admin",
	fallbackLabel = "Retour au tableau de bord",
}: AdminListErrorBoundaryProps) {
	useEffect(() => {
		Sentry.captureException(error, { tags: { route } });
	}, [error, route]);

	return (
		<div
			role="alert"
			className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center"
		>
			<p className="text-muted-foreground/30 text-6xl" aria-hidden="true">
				{emoji}
			</p>
			<h2 className="font-display text-foreground text-xl font-normal">{title}</h2>
			<p className="text-muted-foreground max-w-md text-sm">
				Une erreur inattendue est survenue. L'erreur a été signalée automatiquement.
			</p>
			<div className="flex flex-wrap items-center justify-center gap-2">
				<Button onClick={reset}>Réessayer</Button>
				<Button variant="outline" asChild>
					<Link href={fallbackHref}>{fallbackLabel}</Link>
				</Button>
			</div>
		</div>
	);
}
