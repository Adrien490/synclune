import { getProductBySlug } from "@/modules/products/data/get-product";
import { OgShell } from "@/shared/components/og/og-shell";
import { BRAND_HEX } from "@/shared/constants/brand-colors";
import { ImageResponse } from "next/og";

// Image metadata
export const alt = "Un bijou coloré fait main par Synclune";
export const size = {
	width: 1200,
	height: 630,
};

export const contentType = "image/png";

/**
 * Generates a dynamic Open Graph image for each product.
 * Displays the product photo alongside title, price, and branding.
 *
 * Décor, contraintes Satori et écart de fonte : cf. `OgShell`.
 *
 * ⚠️ C'est la seule des quatre cartes qui porte une PHOTO, donc la seule où le
 * papier du storefront joue un rôle actif : le bijou s'y détache comme sur une
 * page produit, là où l'ancien dégradé rose plein le teintait.
 */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params;
	// includeDraft explicite : cette route est publique et les OG images sont
	// cachées par les crawlers — ne jamais dépendre du défaut Zod implicite.
	const product = await getProductBySlug({ slug, includeDraft: false });

	// Fallback if product not found
	if (!product) {
		return new ImageResponse(
			<OgShell align="center" signature>
				<div style={{ display: "flex", fontSize: 64, fontWeight: 600 }}>Synclune</div>
			</OgShell>,
			{ ...size },
		);
	}

	const primarySku = product.skus[0];
	const price = primarySku?.priceInclTax ? `${(primarySku.priceInclTax / 100).toFixed(2)} €` : null;

	// Get the main product image URL
	const mainImage =
		primarySku?.images.find((img) => img.isPrimary)?.url ?? primarySku?.images[0]?.url;

	return new ImageResponse(
		<OgShell signature>
			<div style={{ display: "flex", alignItems: "center", gap: "56px", width: "100%" }}>
				{mainImage ? (
					<img
						src={mainImage}
						alt=""
						width={340}
						height={340}
						style={{ objectFit: "cover", borderRadius: "20px" }}
					/>
				) : null}

				<div style={{ display: "flex", flexDirection: "column", maxWidth: "620px" }}>
					{product.type && (
						<div
							style={{
								display: "flex",
								fontSize: 24,
								textTransform: "uppercase",
								letterSpacing: "0.1em",
								color: BRAND_HEX.inkMuted,
							}}
						>
							{product.type.label}
						</div>
					)}

					<div
						style={{
							display: "flex",
							marginTop: "16px",
							fontSize: 56,
							fontWeight: 300,
							letterSpacing: "-0.02em",
							lineHeight: 1.1,
						}}
					>
						{product.title}
					</div>

					{price && (
						<div style={{ display: "flex", marginTop: "20px", fontSize: 36, fontWeight: 500 }}>
							{price}
						</div>
					)}
				</div>
			</div>
		</OgShell>,
		{ ...size },
	);
}
