"use client";

import { Button } from "@/shared/components/ui/button";
import type { ErrorPageProps } from "@/shared/types/error.types";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function MarketingError({ error, reset }: ErrorPageProps) {
	return (
		<div
			className="flex min-h-[60vh] items-center justify-center p-6"
			role="alert"
			aria-live="assertive"
		>
			<div className="bg-card w-full max-w-lg rounded-xl border p-8 text-center shadow-sm">
				<div className="bg-destructive/10 mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full">
					<AlertTriangle className="text-destructive h-7 w-7" aria-hidden="true" />
				</div>
				<h1 className="text-xl font-semibold sm:text-2xl">Erreur marketing</h1>
				<p className="text-muted-foreground mt-3">
					Impossible de charger cette section. Veuillez réessayer.
				</p>
				<div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
					<Button onClick={reset}>Réessayer</Button>
					<Button variant="secondary" asChild>
						<Link href="/admin">Tableau de bord</Link>
					</Button>
				</div>
				{error.digest && (
					<p className="text-muted-foreground/60 mt-6 text-xs">Code : {error.digest}</p>
				)}
			</div>
		</div>
	);
}
