"use client"

export default function GlobalError({
	error,
	reset,
}: {
	error: Error & { digest?: string }
	reset: () => void
}) {
	return (
		<html lang="fr">
			<body
				style={{
					margin: 0,
					minHeight: "100vh",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					fontFamily:
						'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
					backgroundColor: "#09090b",
					color: "#fafafa",
				}}
			>
				<main
					role="alert"
					aria-live="assertive"
					style={{ textAlign: "center", padding: "2rem" }}
				>
					<p
						aria-hidden="true"
						style={{
							fontSize: "9rem",
							fontWeight: 600,
							lineHeight: 1,
							opacity: 0.1,
							margin: "0 0 1rem",
							letterSpacing: "-0.02em",
						}}
					>
						500
					</p>
					<h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0 0 0.5rem" }}>
						Une erreur critique est survenue
					</h1>
					<p style={{ color: "#a1a1aa", margin: "0 0 2rem" }}>
						Veuillez réessayer ou retourner à l'accueil.
					</p>
					<div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
						<button
							onClick={reset}
							style={{
								padding: "0.625rem 1.25rem",
								borderRadius: "0.5rem",
								border: "1px solid #27272a",
								backgroundColor: "#fafafa",
								color: "#09090b",
								fontWeight: 500,
								fontSize: "0.875rem",
								cursor: "pointer",
							}}
						>
							Réessayer
						</button>
						<a
							href="/"
							style={{
								padding: "0.625rem 1.25rem",
								borderRadius: "0.5rem",
								border: "1px solid #27272a",
								backgroundColor: "transparent",
								color: "#fafafa",
								fontWeight: 500,
								fontSize: "0.875rem",
								textDecoration: "none",
								display: "inline-flex",
								alignItems: "center",
							}}
						>
							Retour à l'accueil
						</a>
					</div>
					{error.digest && (
						<p style={{ marginTop: "1.5rem", fontSize: "0.75rem", color: "#52525b" }}>
							Code : {error.digest}
						</p>
					)}
				</main>
			</body>
		</html>
	)
}
