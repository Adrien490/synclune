"use client";

import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { useEffect } from "react";

export default function AdminError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		// Log l'erreur pour le monitoring
		console.error("Erreur admin:", error);
	}, [error]);

	return (
		<div
			className="flex items-center justify-center min-h-[50vh] p-6"
			role="alert"
			aria-live="assertive"
		>
			<Card className="max-w-md w-full">
				<CardHeader className="text-center">
					<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
						<AlertTriangle className="h-6 w-6 text-destructive" aria-hidden="true" />
					</div>
					<CardTitle className="text-xl">Une erreur est survenue</CardTitle>
					<CardDescription>
						Nous n'avons pas pu charger cette page. Veuillez réessayer.
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col items-center gap-4">
					<Button
						onClick={reset}
						className="gap-2"
						aria-label="Réessayer de charger la page"
					>
						<RefreshCw className="h-4 w-4" aria-hidden="true" />
						Réessayer
					</Button>
					{error.digest && (
						<p className="text-xs text-muted-foreground">
							Code d'erreur : {error.digest}
						</p>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
