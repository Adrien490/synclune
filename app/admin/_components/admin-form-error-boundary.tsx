"use client";

import { Button } from "@/shared/components/ui/button";
import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useEffect } from "react";

interface AdminFormErrorBoundaryProps {
	error: Error & { digest?: string };
	reset: () => void;
	/** Titre court adapté au formulaire. Ex: "Le formulaire produit n'a pas pu charger". */
	title: string;
	/** Tag Sentry — chemin de la route. Ex: "admin.catalogue.produits.nouveau". */
	route: string;
	/** Lien vers la liste parente. Ex: "/admin/catalogue/produits". */
	backHref: string;
	/** Libellé du lien parent. Default: "Retour à la liste". */
	backLabel?: string;
}

export function AdminFormErrorBoundary({
	error,
	reset,
	title,
	route,
	backHref,
	backLabel = "Retour à la liste",
}: AdminFormErrorBoundaryProps) {
	useEffect(() => {
		Sentry.captureException(error, { tags: { route, surface: "admin-form" } });
	}, [error, route]);

	return (
		<div
			role="alert"
			className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center"
		>
			<h2 className="font-display text-foreground text-xl font-normal">{title}</h2>
			<p className="text-muted-foreground max-w-md text-sm">
				Une erreur inattendue est survenue pendant le chargement du formulaire. L'erreur a été
				signalée automatiquement.
			</p>
			<div className="flex flex-wrap items-center justify-center gap-2">
				<Button onClick={reset}>Réessayer</Button>
				<Button variant="outline" render={<Link href={backHref} />}>
					{backLabel}
				</Button>
			</div>
		</div>
	);
}
