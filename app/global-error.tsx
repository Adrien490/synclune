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
			<head>
				<style
					dangerouslySetInnerHTML={{
						__html: `
@keyframes fadeInUp {
	from { opacity: 0; transform: translateY(12px); }
	to { opacity: 1; transform: translateY(0); }
}
@keyframes drift {
	0%, 100% { transform: translate(0, 0) rotate(0deg); }
	33% { transform: translate(15px, -20px) rotate(5deg); }
	66% { transform: translate(-10px, 10px) rotate(-3deg); }
}
@media (prefers-reduced-motion: reduce) {
	.ge-animate { animation: none !important; opacity: 1 !important; }
	.ge-shape { animation: none !important; }
}
`,
					}}
				/>
			</head>
			<body
				style={{
					margin: 0,
					minHeight: "100vh",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
					background:
						"linear-gradient(135deg, oklch(0.99 0.005 270), oklch(0.97 0.02 341) 40%, oklch(0.97 0.02 86))",
					color: "oklch(0.55 0.01 270)",
					overflow: "hidden",
					position: "relative",
				}}
			>
				{/* Decorative shapes */}
				<div aria-hidden="true">
					<div
						className="ge-shape"
						style={{
							position: "absolute",
							top: "10%",
							left: "15%",
							width: 128,
							height: 128,
							borderRadius: "50%",
							background: "oklch(0.8593 0.097 340.78 / 0.1)",
							filter: "blur(32px)",
							animation: "drift 20s ease-in-out infinite",
						}}
					/>
					<div
						className="ge-shape"
						style={{
							position: "absolute",
							top: "60%",
							right: "10%",
							width: 96,
							height: 96,
							borderRadius: "50%",
							background: "oklch(0.85 0.06 86 / 0.15)",
							filter: "blur(48px)",
							animation: "drift 25s ease-in-out infinite reverse",
						}}
					/>
				</div>

				<div
					role="alert"
					aria-live="assertive"
					className="ge-animate"
					style={{
						textAlign: "center",
						padding: "2rem",
						maxWidth: "32rem",
						position: "relative",
						zIndex: 1,
						animation: "fadeInUp 0.4s ease-out both",
					}}
				>
					<p style={{ fontSize: "4rem", marginBottom: "1rem" }} aria-hidden="true">
						🌙
					</p>
					<h1
						style={{
							fontSize: "1.5rem",
							fontWeight: 600,
							marginBottom: "0.75rem",
							fontFamily: 'Georgia, "Times New Roman", serif',
							color: "oklch(0.13 0.01 270)",
						}}
					>
						Oups, un probleme inattendu
					</h1>
					<p
						style={{
							fontSize: "1rem",
							marginBottom: "1.5rem",
							lineHeight: 1.6,
						}}
					>
						Une erreur critique est survenue. Veuillez reessayer ou revenir a l'accueil.
					</p>
					<div
						style={{
							display: "flex",
							gap: "0.75rem",
							justifyContent: "center",
							flexWrap: "wrap",
						}}
					>
						<button
							onClick={reset}
							style={{
								padding: "0.625rem 1.25rem",
								fontSize: "0.875rem",
								fontWeight: 500,
								color: "oklch(0.1 0 0)",
								background: "oklch(0.8593 0.097 340.78)",
								border: "none",
								borderRadius: "0.5rem",
								cursor: "pointer",
							}}
						>
							Reessayer
						</button>
						{/* eslint-disable-next-line @next/next/no-html-link-for-pages -- global-error renders outside Next.js router context */}
						<a
							href="/"
							style={{
								padding: "0.625rem 1.25rem",
								fontSize: "0.875rem",
								fontWeight: 500,
								color: "oklch(0.13 0.01 270)",
								background: "oklch(0.94 0.01 270)",
								border: "1px solid oklch(0.9 0.01 270)",
								borderRadius: "0.5rem",
								textDecoration: "none",
								display: "inline-block",
							}}
						>
							Retour a l'accueil
						</a>
					</div>
					<p style={{ fontSize: "0.8125rem", marginTop: "1.5rem" }}>
						Besoin d'aide ?{" "}
						<a
							href="mailto:contact@synclune.fr"
							style={{
								color: "oklch(0.8593 0.097 340.78)",
								textDecoration: "underline",
								textUnderlineOffset: "2px",
							}}
						>
							Contactez-nous
						</a>
					</p>
					{error.digest && (
						<p
							style={{
								fontSize: "0.75rem",
								color: "oklch(0.7 0.01 270)",
								marginTop: "1rem",
							}}
						>
							Code : {error.digest}
						</p>
					)}
				</div>
			</body>
		</html>
	);
}
