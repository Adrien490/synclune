"use client";

import { Button } from "@/shared/components/ui/button";
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function DashboardError({
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
		<div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
			<p className="text-muted-foreground/30 text-6xl" aria-hidden="true">
				📊
			</p>
			<h2 className="font-display text-foreground text-xl font-normal">
				Le tableau de bord n'a pas pu charger
			</h2>
			<p className="text-muted-foreground text-sm">
				Une erreur inattendue est survenue. L'erreur a ete signalee automatiquement.
			</p>
			<Button onClick={reset}>Reessayer</Button>
		</div>
	);
}
