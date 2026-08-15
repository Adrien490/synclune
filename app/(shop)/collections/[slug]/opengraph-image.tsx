import { getStorefrontCollectionBySlug } from "@/modules/collections/data/get-collection";
import { OgShell } from "@/shared/components/og/og-shell";
import { BRAND_HEX } from "@/shared/constants/brand-colors";
import { OG_SIZE, renderOgImage } from "@/shared/components/og/render-og";

// Image metadata
export const alt = "Une série de bijoux colorés Synclune";
export const size = { ...OG_SIZE };

export const contentType = "image/png";

/**
 * Genere dynamiquement une image Open Graph pour chaque collection
 * Utilisee pour les partages sur reseaux sociaux (Twitter, Facebook, LinkedIn, etc.)
 *
 * Décor, contraintes Satori et écart de fonte : cf. `OgShell`.
 */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params;
	const collection = await getStorefrontCollectionBySlug({ slug });

	// Fallback si collection non trouvee ou non publiee
	if (!collection || !collection.active) {
		return renderOgImage(
			<OgShell align="center" signature>
				<div style={{ display: "flex", fontSize: 64, fontWeight: 600 }}>Synclune</div>
			</OgShell>,
		);
	}

	// Compter les produits publics
	const publicProductsCount = collection.products.filter((product) => product.active).length;

	return renderOgImage(
		<OgShell align="center" signature>
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					textAlign: "center",
				}}
			>
				{/* « Série », pas « Collection » : c'est le mot du storefront depuis
				    l'harmonisation du langage collections (2026-08-06). */}
				<div
					style={{
						display: "flex",
						fontSize: 26,
						textTransform: "uppercase",
						letterSpacing: "0.1em",
						color: BRAND_HEX.inkMuted,
					}}
				>
					Une série
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
					{collection.name}
				</div>

				{publicProductsCount > 0 && (
					<div
						style={{
							display: "flex",
							marginTop: "20px",
							fontSize: 30,
							color: BRAND_HEX.inkMuted,
						}}
					>
						{publicProductsCount} création{publicProductsCount > 1 ? "s" : ""}
					</div>
				)}
			</div>
		</OgShell>,
	);
}
