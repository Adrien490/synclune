"use client";

import { Button } from "@/shared/components/ui/button";
import * as Sentry from "@sentry/nextjs";
import { BarChart3 } from "lucide-react";
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
			<BarChart3 className="text-muted-foreground/30 size-16" aria-hidden="true" />
			<h2 className="font-display text-foreground text-xl font-normal">
				Le tableau de bord n'a pas pu charger
			</h2>
			<p className="text-muted-foreground text-sm">
				Une erreur inattendue est survenue. L'erreur a été signalée automatiquement.
			</p>
			<Button onClick={reset}>Réessayer</Button>
		</div>
	);
}
