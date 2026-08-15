import { getProductTypeBySlug } from "@/modules/product-types/data/get-product-type";
import { OgShell } from "@/shared/components/og/og-shell";
import { BRAND_HEX } from "@/shared/constants/brand-colors";
import { ImageResponse } from "next/og";

export const alt = "Une famille de bijoux colorés Synclune";
export const size = {
	width: 1200,
	height: 630,
};

export const contentType = "image/png";

/**
 * Genere dynamiquement une image Open Graph pour chaque page categorie produit
 * Utilisee pour les partages sur reseaux sociaux (Twitter, Facebook, LinkedIn, etc.)
 *
 * Décor, contraintes Satori et écart de fonte : cf. `OgShell`.
 */
export default async function Image({ params }: { params: Promise<{ productTypeSlug: string }> }) {
	const { productTypeSlug } = await params;
	const productType = await getProductTypeBySlug({ slug: productTypeSlug });

	if (!productType) {
		return new ImageResponse(
			<OgShell align="center" signature>
				<div style={{ display: "flex", fontSize: 64, fontWeight: 600 }}>Synclune</div>
			</OgShell>,
			{ ...size },
		);
	}

	return new ImageResponse(
		<OgShell align="center" signature>
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					textAlign: "center",
				}}
			>
				<div
					style={{
						display: "flex",
						fontSize: 26,
						textTransform: "uppercase",
						letterSpacing: "0.1em",
						color: BRAND_HEX.inkMuted,
					}}
				>
					Les créations
				</div>

				<div
					style={{
						display: "flex",
						marginTop: "18px",
						maxWidth: "900px",
						fontSize: 72,
						fontWeight: 300,
						letterSpacing: "-0.02em",
						lineHeight: 1.1,
					}}
				>
					{productType.label}
				</div>
			</div>
		</OgShell>,
		{ ...size },
	);
}
