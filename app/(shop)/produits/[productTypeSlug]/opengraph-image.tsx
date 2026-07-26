import { getProductTypeBySlug } from "@/modules/product-types/data/get-product-type";
import { OG_GRADIENT } from "@/shared/constants/brand-colors";
import { ImageResponse } from "next/og";

export const alt = "Catégorie Synclune";
export const size = {
	width: 1200,
	height: 630,
};

export const contentType = "image/png";

/**
 * Genere dynamiquement une image Open Graph pour chaque page categorie produit
 * Utilisee pour les partages sur reseaux sociaux (Twitter, Facebook, LinkedIn, etc.)
 */
export default async function Image({ params }: { params: Promise<{ productTypeSlug: string }> }) {
	const { productTypeSlug } = await params;
	const productType = await getProductTypeBySlug({ slug: productTypeSlug });

	if (!productType) {
		return new ImageResponse(
			<div
				style={{
					fontSize: 64,
					background: OG_GRADIENT,
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
			</div>,
			{ ...size },
		);
	}

	return new ImageResponse(
		<div
			style={{
				background: OG_GRADIENT,
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
				Catégorie
			</div>

			<div
				style={{
					fontSize: 72,
					fontWeight: 700,
					textAlign: "center",
					marginBottom: "30px",
					lineHeight: 1.2,
					maxWidth: "900px",
					display: "flex",
					textShadow: "0 2px 8px rgba(90,20,60,0.35)",
				}}
			>
				{productType.label}
			</div>

			{productType.description && (
				<div
					style={{
						fontSize: 28,
						fontWeight: 400,
						textAlign: "center",
						marginBottom: "40px",
						opacity: 0.9,
						maxWidth: "900px",
						lineHeight: 1.4,
						display: "flex",
					}}
				>
					{productType.description.length > 140
						? `${productType.description.slice(0, 140)}…`
						: productType.description}
				</div>
			)}

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
					Créations artisanales faites main en France
				</div>
			</div>
		</div>,
		{ ...size },
	);
}
