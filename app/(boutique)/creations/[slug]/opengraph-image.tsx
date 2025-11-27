import { getProductBySlug } from "@/modules/products/data/get-product";
import { ImageResponse } from "next/og";

// Image metadata
export const alt = "Bijou artisanal Synclune";
export const size = {
	width: 1200,
	height: 630,
};

export const contentType = "image/png";

/**
 * Génère dynamiquement une image Open Graph pour chaque produit
 * Utilisé pour les partages sur réseaux sociaux (Twitter, Facebook, LinkedIn, etc.)
 */
export default async function Image({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;
	const product = await getProductBySlug({ slug });

	// Fallback si produit non trouvé
	if (!product) {
		return new ImageResponse(
			(
				<div
					style={{
						fontSize: 64,
						background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
						width: "100%",
						height: "100%",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						color: "white",
						fontFamily: "sans-serif",
					}}
				>
					Synclune
				</div>
			),
			{ ...size }
		);
	}

	// ✅ SIMPLE : product.skus[0] = SKU principal
	const primarySku = product.skus[0];
	const price = primarySku?.priceInclTax
		? `${(primarySku.priceInclTax / 100).toFixed(2)}€`
		: null;

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
				{/* Badge type de produit */}
				{product.type && (
					<div
						style={{
							fontSize: 28,
							fontWeight: 500,
							textTransform: "uppercase",
							letterSpacing: "0.1em",
							marginBottom: "20px",
							opacity: 0.9,
							display: "flex",
						}}
					>
						{product.type.label}
					</div>
				)}

				{/* Titre du produit */}
				<div
					style={{
						fontSize: 72,
						fontWeight: 700,
						textAlign: "center",
						marginBottom: "30px",
						lineHeight: 1.2,
						maxWidth: "900px",
						display: "flex",
					}}
				>
					{product.title}
				</div>

				{/* Description courte ou prix */}
				{price && (
					<div
						style={{
							fontSize: 48,
							fontWeight: 600,
							marginBottom: "40px",
							display: "flex",
						}}
					>
						{price}
					</div>
				)}

				{/* Marque et tagline */}
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						gap: "10px",
					}}
				>
					<div
						style={{
							fontSize: 36,
							fontWeight: 700,
							letterSpacing: "0.05em",
							display: "flex",
						}}
					>
						Synclune
					</div>
					<div
						style={{
							fontSize: 24,
							fontWeight: 400,
							opacity: 0.9,
							display: "flex",
						}}
					>
						Créations artisanales faites main à Nantes
					</div>
				</div>
			</div>
		),
		{ ...size }
	);
}
