"use client";

import { Button } from "@/shared/components/ui/button";
import type { ErrorPageProps } from "@/shared/types/error.types";
import { AlertCircle } from "lucide-react";

export default function PersonnalisationError({ reset }: ErrorPageProps) {
	return (
		<div className="flex min-h-screen items-center justify-center px-4">
			<div className="max-w-md space-y-4 text-center">
				<AlertCircle className="text-destructive mx-auto h-12 w-12" />
				<h1 className="text-xl font-semibold">Une erreur est survenue</h1>
				<p className="text-muted-foreground">
					Impossible de charger le formulaire de personnalisation. Veuillez réessayer.
				</p>
				<Button onClick={reset}>Réessayer</Button>
			</div>
		</div>
	);
}
