"use client";

import { Button } from "@/shared/components/ui/button";
import type { ErrorPageProps } from "@/shared/types/error.types";
import { AlertCircle, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function AuthError({ error: _error, reset }: ErrorPageProps) {
	return (
		<div className="flex min-h-screen items-center justify-center px-4">
			<div className="w-full max-w-md space-y-6 text-center">
				<div className="bg-destructive/10 mx-auto flex h-12 w-12 items-center justify-center rounded-full">
					<AlertCircle className="text-destructive h-6 w-6" aria-hidden="true" />
				</div>

				<div className="space-y-2">
					<h1 className="text-xl font-semibold">Une erreur est survenue</h1>
					<p className="text-muted-foreground text-sm">
						Nous n'avons pas pu charger cette page. Veuillez réessayer.
					</p>
				</div>

				<div className="flex flex-col justify-center gap-3 sm:flex-row">
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
