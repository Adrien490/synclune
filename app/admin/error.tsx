"use client";

import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

interface ErrorProps {
	error: Error & { digest?: string };
	reset: () => void;
}

export default function AdminError({ error, reset }: ErrorProps) {
	useEffect(() => {
		// Log l'erreur pour le monitoring (Sentry, etc.)
		console.error("Admin error:", error);
	}, [error]);

	return (
		<div
			className="flex items-center justify-center min-h-[60vh] p-4"
			role="alert"
			aria-live="assertive"
		>
			<Card className="max-w-md w-full">
				<CardHeader className="text-center">
					<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
						<AlertTriangle className="h-6 w-6 text-destructive" />
					</div>
					<CardTitle className="text-xl">Une erreur est survenue</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<p className="text-center text-muted-foreground text-sm">
						Nous n&apos;avons pas pu charger cette page. Veuillez réessayer ou
						retourner au tableau de bord.
					</p>

					{process.env.NODE_ENV === "development" && error.message && (
						<div className="rounded-md bg-muted p-3 text-xs font-mono text-muted-foreground overflow-auto max-h-32">
							{error.message}
						</div>
					)}

					<div className="flex flex-col sm:flex-row gap-2">
						<Button
							onClick={reset}
							variant="default"
							className="flex-1 cursor-pointer"
						>
							<RefreshCw className="h-4 w-4 mr-2" />
							Réessayer
						</Button>
						<Button asChild variant="outline" className="flex-1">
							<Link href="/admin">
								<Home className="h-4 w-4 mr-2" />
								Tableau de bord
							</Link>
						</Button>
					</div>

					{error.digest && (
						<p className="text-center text-xs text-muted-foreground">
							Code erreur : {error.digest}
						</p>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
