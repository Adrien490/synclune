import type { ReactNode } from "react";

import { ogRailMark } from "@/shared/components/og/og-marks";
import { BRAND_HEX } from "@/shared/constants/brand-colors";

/**
 * La coquille commune des cartes de partage — le papier, l'encre, les quatre
 * touches de pinceau, la signature.
 *
 * @description
 * Elle existe pour qu'il n'y ait **qu'une** identité de partage. Les quatre
 * routes OG (accueil, création, collection, famille de produits) rendaient
 * chacune son propre dégradé rose avec du texte blanc, et trois d'entre elles
 * signaient « Créations artisanales faites main » — la formule que
 * `docs/BRAND-DA.md` § ADN écarte comme interchangeable. Refaire l'accueil seul
 * aurait fabriqué deux marques.
 *
 * Le CONTENU reste à chaque route (une photo de bijou, un nom de série, un
 * compteur n'ont pas la même composition) ; seul le décor est ici.
 *
 * ⚠️ **Satori, pas un navigateur.** Aucune `var(--…)` ni `oklch()` — elles sont
 * ignorées EN SILENCE, et la carte part en production avec du noir par défaut
 * (d'où `BRAND_HEX`). Tout nœud à plusieurs enfants exige un `display`
 * explicite. Les SVG passent par un `<img>` en data-URI. Une modification ici
 * se vérifie sur le PNG rendu, jamais au typecheck.
 *
 * ⚠️ La fonte est celle qu'embarque `@vercel/og`, pas la display de marque
 * (Winky Sans) : Satori refuse le woff2 et les fontes variables, et les
 * artefacts de `next/font` sont des woff2 aux noms hachés, illisibles au
 * runtime. L'embarquer demanderait de committer une instance statique — c'est
 * le seul écart typographique restant, assumé.
 *
 * ⚠️ **L'URL d'une carte de segment dynamique est SIGNÉE** — Next la sert à
 * `…/opengraph-image-<id>?<hash>`, jamais au chemin nu, qui répond 404. Pour
 * vérifier un rendu, lire le `content` de la balise `og:image` de la page.
 */
export function OgShell({
	children,
	align = "flex-start",
	signature = false,
}: {
	children: ReactNode;
	/** `center` pour les cartes sans photo, dont le contenu est une pile centrée. */
	align?: "flex-start" | "center";
	/**
	 * Pose la signature en pied. L'accueil s'en passe : son titre dit déjà la
	 * marque, et la guirlande occupe ce pied.
	 */
	signature?: boolean;
}) {
	return (
		<div
			style={{
				width: "100%",
				height: "100%",
				display: "flex",
				flexDirection: "column",
				justifyContent: "space-between",
				alignItems: align,
				background: BRAND_HEX.paper,
				color: BRAND_HEX.ink,
				padding: "72px 80px",
				fontFamily: "sans-serif",
			}}
		>
			{/* Les quatre touches — l'ouverture du bloc titre du site, et le seul
			    signe de marque polychrome à lui tout seul. */}
			{/* eslint-disable-next-line @next/next/no-img-element -- Satori ne rend que <img> */}
			<img src={ogRailMark()} alt="" width={220} height={15} />

			{children}

			{/* La signature reprend l'alignement de la carte : la laisser choisir le
			    sien la faisait pendre à gauche sous un contenu centré.
			    ⚠️ Elle disait « Créations artisanales faites main (en France) » —
			    juste et **interchangeable**, le reproche central du § ADN de
			    `docs/BRAND-DA.md`. La formulation courte de référence dit le monde
			    que la marque vend, pas seulement sa méthode de fabrication. */}
			{signature && (
				<div style={{ display: "flex", flexDirection: "column", alignItems: align, gap: "6px" }}>
					<div style={{ display: "flex", fontSize: 30, fontWeight: 600 }}>Synclune</div>
					<div style={{ display: "flex", fontSize: 22, color: BRAND_HEX.inkMuted }}>
						Des petits mondes colorés à porter · Nantes
					</div>
				</div>
			)}
		</div>
	);
}
