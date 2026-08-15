import { prisma } from "@/shared/lib/prisma";
import { OgShell } from "@/shared/components/og/og-shell";
import { BRAND_HEX } from "@/shared/constants/brand-colors";
import { OG_SIZE, renderOgImage } from "@/shared/components/og/render-og";

export const alt = "Une famille de bijoux colorés Synclune";
export const size = { ...OG_SIZE };

export const contentType = "image/png";

/**
 * Genere dynamiquement une image Open Graph pour chaque page categorie produit
 * Utilisee pour les partages sur reseaux sociaux (Twitter, Facebook, LinkedIn, etc.)
 *
 * Décor, contraintes Satori et écart de fonte : cf. `OgShell`.
 */
export default async function Image({ params }: { params: Promise<{ productTypeSlug: string }> }) {
	const { productTypeSlug } = await params;
	// Lecture Prisma DIRECTE : appeler une fonction "use cache" depuis une route
	// d'image OG casse le streaming en build de production (« failed to pipe
	// response », réponse vide — débusqué par seo.spec au lot 7). L'image est
	// mise en cache par sa propre URL hashée, le cache applicatif n'apporte rien.
	const productType = await prisma.productType.findUnique({
		where: { slug: productTypeSlug },
		select: { label: true },
	});

	if (!productType) {
		return renderOgImage(
			<OgShell align="center" signature>
				<div style={{ display: "flex", fontSize: 64, fontWeight: 600 }}>Synclune</div>
			</OgShell>,
		);
	}

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
	);
}
