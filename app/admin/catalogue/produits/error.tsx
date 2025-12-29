"use client";

import { Button } from "@/shared/components/ui/button";
import type { ErrorPageProps } from "@/shared/types/error.types";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function ProductsError({ error, reset }: ErrorPageProps) {
	return (
		<div
			className="flex items-center justify-center min-h-[60vh] p-6"
			role="alert"
			aria-live="assertive"
		>
			<div className="max-w-lg w-full rounded-xl border bg-card p-8 text-center shadow-sm">
				<div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
					<AlertTriangle
						className="h-7 w-7 text-destructive"
						aria-hidden="true"
					/>
				</div>
				<h2 className="text-2xl font-semibold">
					Erreur lors du chargement des produits
				</h2>
				<p className="mt-3 text-muted-foreground">
					Impossible de charger la liste des produits. Veuillez réessayer ou
					retourner au catalogue.
				</p>
				<div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
					<Button onClick={reset}>Réessayer</Button>
					<Button variant="secondary" asChild>
						<Link href="/admin/catalogue">Catalogue</Link>
					</Button>
				</div>
				{error.digest && (
					<p className="mt-6 text-xs text-muted-foreground/60">
						Code : {error.digest}
					</p>
				)}
			</div>
		</div>
	);
}
