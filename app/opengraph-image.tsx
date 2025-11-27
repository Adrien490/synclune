import { BUSINESS_INFO } from "@/shared/constants/seo-config";
import { ImageResponse } from "next/og";

// Image metadata
export const alt = "Synclune - Créatrice de bijoux faits main à Nantes";
export const size = {
	width: 1200,
	height: 630,
};

export const contentType = "image/png";

/**
 * Génère l'image Open Graph par défaut pour le site
 * Utilisée sur les pages qui n'ont pas d'image OG spécifique
 */
export default async function Image() {
	return new ImageResponse(
		(
			<div
				style={{
					background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
					width: "100%",
					height: "100%",
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					padding: "80px",
					fontFamily: "sans-serif",
					color: "white",
				}}
			>
				{/* Nom de la marque */}
				<div
					style={{
						fontSize: 96,
						fontWeight: 700,
						textAlign: "center",
						marginBottom: "30px",
						letterSpacing: "0.02em",
						display: "flex",
					}}
				>
					{BUSINESS_INFO.name}
				</div>

				{/* Description */}
				<div
					style={{
						fontSize: 36,
						fontWeight: 400,
						textAlign: "center",
						maxWidth: "900px",
						lineHeight: 1.4,
						opacity: 0.95,
						display: "flex",
					}}
				>
					Créatrice de bijoux faits main avec amour à Nantes
				</div>

				{/* Tagline */}
				<div
					style={{
						fontSize: 28,
						fontWeight: 300,
						textAlign: "center",
						marginTop: "40px",
						opacity: 0.85,
						display: "flex",
					}}
				>
					Bijoux artisanaux colorés et originaux
				</div>
			</div>
		),
		{ ...size }
	);
}
