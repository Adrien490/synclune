"use client"

import { PageHeader } from "@/shared/components/page-header"
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert"
import { Button } from "@/shared/components/ui/button"
import { AlertTriangle, RefreshCw } from "lucide-react"

export default function CheckoutError({
	error,
	reset,
}: {
	error: Error & { digest?: string }
	reset: () => void
}) {
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
								Nous n'avons pas pu charger la page de paiement.
								Ton panier est toujours disponible.
							</p>
							<Button onClick={reset} variant="outline" size="sm">
								<RefreshCw className="w-4 h-4 mr-2" />
								Reessayer
							</Button>
						</AlertDescription>
					</Alert>
				</div>
			</section>
		</div>
	)
}
