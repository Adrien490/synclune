import { CollectionStatus } from "@/app/generated/prisma/client";
import { getCollectionBySlug } from "@/modules/collections/data/get-collection";
import { ImageResponse } from "next/og";

// Image metadata
export const alt = "Collection Synclune";
export const size = {
	width: 1200,
	height: 630,
};

export const contentType = "image/png";

/**
 * Genere dynamiquement une image Open Graph pour chaque collection
 * Utilisee pour les partages sur reseaux sociaux (Twitter, Facebook, LinkedIn, etc.)
 */
export default async function Image({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;
	const collection = await getCollectionBySlug({ slug });

	// Fallback si collection non trouvee ou non publiee
	if (!collection || collection.status !== CollectionStatus.PUBLIC) {
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

	// Compter les produits publics
	const publicProductsCount = collection.products.filter(
		(pc) => pc.product.status === "PUBLIC"
	).length;

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
				{/* Badge Collection */}
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
					Collection
				</div>

				{/* Nom de la collection */}
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
					{collection.name}
				</div>

				{/* Nombre de produits */}
				{publicProductsCount > 0 && (
					<div
						style={{
							fontSize: 32,
							fontWeight: 500,
							marginBottom: "40px",
							opacity: 0.9,
							display: "flex",
						}}
					>
						{publicProductsCount} creation{publicProductsCount > 1 ? "s" : ""}
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
						Creations artisanales faites main a Nantes
					</div>
				</div>
			</div>
		),
		{ ...size }
	);
}
