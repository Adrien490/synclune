"use client"

import { useEffect } from "react"

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
					<svg
						className="h-6 w-6 text-destructive"
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
						aria-hidden="true"
					>
						<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
						<path d="M12 9v4" />
						<path d="M12 17h.01" />
					</svg>
				</div>
				<h2 className="text-xl font-semibold">Une erreur est survenue</h2>
				<p className="mt-2 text-sm text-muted-foreground">
					Nous n&apos;avons pas pu charger cette page. Veuillez réessayer.
				</p>
				<button
					onClick={reset}
					className="mt-4 inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
					aria-label="Réessayer de charger la page"
				>
					<svg
						className="h-4 w-4"
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
						aria-hidden="true"
					>
						<path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
						<path d="M21 3v5h-5" />
					</svg>
					Réessayer
				</button>
				{error.digest && (
					<p className="mt-4 text-xs text-muted-foreground">
						Code d&apos;erreur : {error.digest}
					</p>
				)}
			</div>
		</div>
	)
}
