"use client";

import { Button } from "@/shared/components/ui/button";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function DiscountsError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		Sentry.captureException(error, { tags: { route: "admin.marketing.discounts" } });
	}, [error]);

	return (
		<div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
			<p className="text-muted-foreground/30 text-6xl" aria-hidden="true">
				🎟️
			</p>
			<h2 className="font-display text-foreground text-xl font-normal">
				Les codes promo n'ont pas pu charger
			</h2>
			<p className="text-muted-foreground max-w-md text-sm">
				Une erreur inattendue est survenue. L'erreur a ete signalee automatiquement.
			</p>
			<div className="flex flex-wrap items-center justify-center gap-2">
				<Button onClick={reset}>Reessayer</Button>
				<Button variant="outline" asChild>
					<Link href="/admin">Retour au tableau de bord</Link>
				</Button>
			</div>
		</div>
	);
}
