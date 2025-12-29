"use client"

import { PageHeader } from "@/shared/components/page-header"
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert"
import { Button } from "@/shared/components/ui/button"
import type { ErrorPageProps } from "@/shared/types/error.types"
import { AlertTriangle, RefreshCw, Home } from "lucide-react"
import Link from "next/link"

export default function EspaceClientError({ error, reset }: ErrorPageProps) {
	return (
		<div className="min-h-screen">
			<PageHeader title="Erreur" />
			<section className="bg-background py-12">
				<div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
					<Alert variant="destructive">
						<AlertTriangle className="h-4 w-4" />
						<AlertTitle>Une erreur est survenue</AlertTitle>
						<AlertDescription className="mt-2 space-y-4">
							<p>
								Nous n'avons pas pu charger cette page de votre espace client.
								Veuillez réessayer ou retourner à l'accueil.
							</p>
							<div className="flex gap-2">
								<Button onClick={reset} variant="outline" size="sm">
									<RefreshCw className="w-4 h-4 mr-2" />
									Réessayer
								</Button>
								<Button asChild variant="ghost" size="sm">
									<Link href="/">
										<Home className="w-4 h-4 mr-2" />
										Accueil
									</Link>
								</Button>
							</div>
						</AlertDescription>
					</Alert>
					{error.digest && (
						<p className="mt-4 text-xs text-muted-foreground/60">
							Code : {error.digest}
						</p>
					)}
				</div>
			</section>
		</div>
	)
}
