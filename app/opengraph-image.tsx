import { OG_CREATIONS_ASPECT, ogBrushMark, ogCreationsMark } from "@/shared/components/og/og-marks";
import { OgShell } from "@/shared/components/og/og-shell";
import { BRAND_HEX } from "@/shared/constants/brand-colors";
import { ImageResponse } from "next/og";

// Pas de `export const dynamic = "force-static"` ici : sous `cacheComponents`,
// Next 16.3 REFUSE ce segment config et fait échouer le build. Il est inutile —
// cette image ne lit que des constantes de module (aucun fetch, aucune donnée
// requête), donc le prerender extrait la coquille statique tout seul.

// Image metadata
export const alt = "Synclune — bijoux colorés faits main à Nantes";
export const size = {
	width: 1200,
	height: 630,
};

export const contentType = "image/png";

/** Largeur de rendu du présentoir ; sa hauteur en est dérivée. */
const CREATIONS_WIDTH = 520;

/**
 * L'image Open Graph par défaut — la carte de partage de l'accueil, et le
 * repli de toute page sans image propre.
 *
 * @description
 * ⚠️ **C'est le seul visuel de la landing qui appartienne au dépôt.** Ses dix
 * autres images sont le catalogue (photos produit et couvertures de série) plus
 * le portrait de Léane, aujourd'hui absent (`IMAGES.FOUNDER`). C'est ce constat
 * qui a fait refaire cette carte le 2026-08-06 (audit de conformité avec
 * `docs/BRAND-DA.md`) : elle était un dégradé rose plein avec du sans-serif
 * blanc et « Créatrice de bijoux faits main avec amour » — ni motif, ni trait
 * dessiné, ni polychromie, et une copie que n'importe quelle boutique de bijoux
 * aurait pu signer.
 *
 * Elle rend désormais LA PAGE, pas une bannière : le papier du storefront et
 * ses quatre touches de pinceau (via `OgShell`), son `h1` exact avec le
 * surligneur aux quatre accents derrière « colorés », et la guirlande de son
 * premier écran. Chaque signe vient de la SSOT des tracés
 * (`shared/components/hand-drawn/paths.ts`) — rien n'est redessiné ici.
 *
 * ⚠️ C'est la seule des quatre cartes qui ne porte PAS `OgSignature` : son titre
 * dit déjà la marque, et la guirlande occupe le pied. Les contraintes Satori et
 * l'écart de fonte sont documentés sur `OgShell`.
 */
export default function Image() {
	return new ImageResponse(
		<OgShell>
			<div style={{ display: "flex", flexDirection: "column" }}>
				{/* Le `h1` de la home, mot pour mot. Le surligneur est posé DERRIÈRE
				    « colorés » : un calque absolu sous le mot, le montage de
				    `brush-highlight.tsx`. Chaque fragment est en `flex` parce que Satori
				    exige un `display` explicite dès qu'un nœud a plusieurs enfants. */}
				<div
					style={{
						display: "flex",
						flexWrap: "wrap",
						alignItems: "center",
						fontSize: 82,
						fontWeight: 300,
						letterSpacing: "-0.02em",
						lineHeight: 1.06,
					}}
				>
					<span style={{ display: "flex" }}>Des bijoux&nbsp;</span>
					<span style={{ display: "flex", position: "relative" }}>
						<img
							src={ogBrushMark()}
							alt=""
							width={300}
							height={62}
							style={{ position: "absolute", left: -10, top: 22 }}
						/>
						<span style={{ display: "flex" }}>colorés,</span>
					</span>
					<span style={{ display: "flex" }}>&nbsp;faits un par un</span>
				</div>

				<div
					style={{
						display: "flex",
						marginTop: "28px",
						fontSize: 34,
						color: BRAND_HEX.inkMuted,
					}}
				>
					Peints et assemblés à la main, dans mon atelier à Nantes
				</div>
			</div>

			{/* Le présentoir ferme la carte comme il ferme le bloc titre : des créations
			    SUSPENDUES à un cordon, pas des motifs posés sur une ligne. C'est la seule
			    surface de partage où la marque montre ce qu'elle fabrique. */}
			<div style={{ display: "flex", width: "100%", justifyContent: "flex-end" }}>
				<img
					src={ogCreationsMark()}
					alt=""
					width={CREATIONS_WIDTH}
					// Hauteur DÉRIVÉE du ratio natif de la scène : une hauteur écrite à la
					// main écraserait le présentoir sans que rien ne le signale — c'est en
					// prenant le viewBox du CORDON (420 × 36) pour celui de la SCÈNE
					// (420 × 106) que la version guirlande avait sorti des motifs rognés.
					height={Math.round(CREATIONS_WIDTH / OG_CREATIONS_ASPECT)}
				/>
			</div>
		</OgShell>,
		{ ...size },
	);
}
