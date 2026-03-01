"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		Sentry.captureException(error);
	}, [error]);

	return (
		<html lang="fr">
			<body
				style={{
					margin: 0,
					minHeight: "100vh",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
					background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)",
					color: "#e4e4e7",
				}}
			>
				<div style={{ textAlign: "center", padding: "2rem", maxWidth: "32rem" }}>
					<p style={{ fontSize: "4rem", marginBottom: "1rem" }} aria-hidden="true">
						🌙
					</p>
					<h1
						style={{
							fontSize: "1.5rem",
							fontWeight: 600,
							marginBottom: "0.75rem",
						}}
					>
						Oups, un probleme inattendu
					</h1>
					<p
						style={{
							fontSize: "1rem",
							color: "#a1a1aa",
							marginBottom: "1.5rem",
							lineHeight: 1.6,
						}}
					>
						Une erreur critique est survenue. Veuillez reessayer ou revenir a l'accueil.
					</p>
					<div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
						<button
							onClick={reset}
							style={{
								padding: "0.625rem 1.25rem",
								fontSize: "0.875rem",
								fontWeight: 500,
								color: "#fff",
								background: "#6d28d9",
								border: "none",
								borderRadius: "0.5rem",
								cursor: "pointer",
							}}
						>
							Reessayer
						</button>
						<a
							href="/"
							style={{
								padding: "0.625rem 1.25rem",
								fontSize: "0.875rem",
								fontWeight: 500,
								color: "#e4e4e7",
								background: "#27272a",
								border: "1px solid #3f3f46",
								borderRadius: "0.5rem",
								textDecoration: "none",
								display: "inline-block",
							}}
						>
							Retour a l'accueil
						</a>
					</div>
					{error.digest && (
						<p style={{ fontSize: "0.75rem", color: "#52525b", marginTop: "1.5rem" }}>
							Code : {error.digest}
						</p>
					)}
				</div>
			</body>
		</html>
	);
}
