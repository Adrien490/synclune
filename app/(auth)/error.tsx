"use client";

import { Button } from "@/shared/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function AuthError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<div className="min-h-screen flex items-center justify-center px-4">
			<div className="w-full max-w-md text-center space-y-6">
				<div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
					<AlertCircle className="h-6 w-6 text-destructive" aria-hidden="true" />
				</div>

				<div className="space-y-2">
					<h1 className="text-xl font-semibold">Une erreur est survenue</h1>
					<p className="text-sm text-muted-foreground">
						Nous n'avons pas pu charger cette page. Veuillez réessayer.
					</p>
				</div>

				<div className="flex flex-col sm:flex-row gap-3 justify-center">
					<Button onClick={reset} variant="outline" className="gap-2">
						<RefreshCw className="h-4 w-4" aria-hidden="true" />
						Réessayer
					</Button>
					<Button asChild>
						<Link href="/connexion">Retour à la connexion</Link>
					</Button>
				</div>
			</div>
		</div>
	);
}
