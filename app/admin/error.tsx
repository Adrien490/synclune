"use client"

import { useEffect } from "react"
import { Button } from "@/shared/components/ui/button"
import { RefreshCw, AlertTriangle } from "lucide-react"

export default function AdminError({
	error,
	reset,
}: {
	error: Error & { digest?: string }
	reset: () => void
}) {
	useEffect(() => {
		console.error("Erreur admin:", error)
	}, [error])

	return (
		<div
			className="flex items-center justify-center min-h-[50vh] p-6"
			role="alert"
			aria-live="assertive"
		>
			<div className="max-w-md w-full rounded-lg border bg-card p-6 text-center shadow-sm">
				<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
					<AlertTriangle className="h-6 w-6 text-destructive" aria-hidden="true" />
				</div>
				<h2 className="text-xl font-semibold">Une erreur est survenue</h2>
				<p className="mt-2 text-sm text-muted-foreground">
					Nous n&apos;avons pas pu charger cette page. Veuillez réessayer.
				</p>
				<Button
					onClick={reset}
					className="mt-4"
					aria-label="Réessayer de charger la page"
				>
					<RefreshCw className="h-4 w-4" aria-hidden="true" />
					Réessayer
				</Button>
				{error.digest && (
					<p className="mt-4 text-xs text-muted-foreground">
						Code d&apos;erreur : {error.digest}
					</p>
				)}
			</div>
		</div>
	)
}
