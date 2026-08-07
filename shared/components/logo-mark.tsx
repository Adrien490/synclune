import { cn } from "@/shared/utils/cn";

import { GLOSS_PATH, SPARK_ANCHORS, SPARK_LEFT_PATH, SPARK_RIGHT_PATH } from "./logo-mark.paths";

/**
 * La marque, dessinée en SVG inline plutôt que servie en image.
 *
 * ## Pourquoi ce n'est plus un `<Image>`
 *
 * `public/logo.webp` était un raster **opaque** de 256 × 256 dont **54,9 % des
 * pixels valaient exactement `#fdb8e4`** — c'est-à-dire `--primary`. Plus de la
 * moitié d'un bitmap décodé à chaque rendu servait donc à peindre un aplat que le
 * CSS possédait déjà en jeton, et le fond cuit interdisait à la marque de poser
 * ailleurs que sur son propre disque rose. Sur un site dont le positionnement EST
 * la couleur, c'était le seul élément qui ne participait à aucun accent.
 *
 * Ici le socle est un jeton (`--logo-disc`), l'encre un autre (`--logo-ink`), et
 * l'initiale est une **découpe** : elle laisse voir le socle au travers,
 * exactement comme dans le dessin d'origine. Recolorer le disque recolore donc
 * l'initiale sans rien d'autre à faire.
 *
 * Corollaires : zéro requête, zéro transformation `/_next/image` facturée, zéro
 * CLS, et net à toute taille — le raster, lui, était déjà agrandi par le
 * navigateur dès 96 px sur un écran ×3, sa source ne faisant que 256 px.
 *
 * ## Un seul `<svg>`, et le disque est PEINT (audit 2026-08-06)
 *
 * Le socle était un `background-color` sur un `<span>` en `overflow-hidden`, avec
 * trois `<svg>` par-dessus. Deux défauts, tous deux invisibles à l'écran :
 *
 * - **à l'impression**, un fond CSS est supprimé par défaut (`print-color-adjust`)
 *   alors qu'un `fill` SVG survit — une page de suivi de commande imprimée rendait
 *   donc l'initiale rose SANS son disque ;
 * - l'`overflow-hidden` n'a jamais rien découpé : le point du cœur le plus éloigné
 *   du centre est à 94,7 de rayon, dans un disque de 128.
 *
 * Un `<circle>` dans le même `<svg>` règle les deux et divise le nombre de nœuds
 * par deux.
 */
interface LogoMarkProps {
	/** Classe de l'enveloppe. La taille vient du call site. */
	className?: string;
	/**
	 * Les étincelles débordent-elles du socle ?
	 *
	 * `"inside"` reproduit le dessin d'origine. `"escaping"` est le geste de la
	 * direction « L'étincelle » : les deux étoiles passent par-dessus bord, la
	 * silhouette cesse d'être un rond parfait et la marque se reconnaît plus vite
	 * à taille égale.
	 */
	sparkles?: "inside" | "escaping";
	/**
	 * Niveau de détail, dérivé de la taille de rendu par `Logo`.
	 *
	 * `"compact"` retire le reflet et affine le trait. Sous 40 px, `GLOSS_PATH`
	 * mesure ~16 × 36 dans la viewBox, soit **1,8 × 4 px** de blanc à 50 %
	 * d'opacité : il ne peint plus un reflet, il salit le lobe.
	 *
	 * ⚠️ L'INITIALE ne saute jamais, à aucune taille — c'est le « S » de
	 * Synclune, la charge utile du mark. Ce qui cède, c'est le reflet.
	 */
	detail?: "full" | "compact";
	/**
	 * Épaisseur du contour en pixels écran, cf. `logoStrokeWidth()`.
	 *
	 * Le défaut correspond au plancher : c'est ce que rend un mark de 64 px ou
	 * moins, soit toutes les surfaces sauf la page « boutique fermée ».
	 */
	strokePx?: number;
	/** Anime les étincelles au survol et au focus de l'ancêtre marqué `group/logo`. */
	animated?: boolean;
}

/** L'épaisseur d'origine du contour, en unités de la viewBox 256. */
const STROKE_USER_UNITS = 3;

/**
 * Plancher de l'épaisseur du contour, en pixels ÉCRAN.
 *
 * Tout le mark tient sur son contour : le cœur ne se détache de son disque que
 * de **1,27:1**, une étincelle de son cœur de **1,26:1** et du disque de
 * **1,60:1**. Seul `--logo-ink` (8,32:1 sur le rose) sépare les formes.
 *
 * Or `strokeWidth={3}` dans une viewBox de 256 rend **0,33 px à 28 px** (tunnel
 * de paiement), 0,47 px à 40 px (footer, navbar mobile, rail admin) et 0,56 px à
 * 48 px (navbar desktop). Sous le pixel, un trait n'est pas fin : il est peint en
 * alpha partiel, le brun vire au rose translucide et les 8,32:1 s'évaporent.
 * `public/icons/favicon-16x16.png` en est la démonstration.
 *
 * ## Pourquoi un PLANCHER, et pas une épaisseur constante
 *
 * Une épaisseur fixe (`non-scaling-stroke` seul) répare les petites tailles et
 * casse les grandes, dans les deux sens :
 *
 * - **trop haut** — 1,5 px, l'appel du trait de la maison (`HAND_DRAWN_STROKES.fin`,
 *   le poids `regular` de Phosphor), a été essayé et REFUSÉ au rendu : sur un mark
 *   pastel dont l'encre est un brun à 8,32:1, le dessin se lit « cerné de noir » et
 *   la douceur du feutre disparaît. Le mark n'est pas une icône de 24 px — son
 *   contour ceint des aplats, il ne PORTE pas la forme à lui seul ;
 * - **trop bas** — à 96 px (page « boutique fermée »), le trait d'origine vaut déjà
 *   1,13 px. Le figer plus bas ferait MAIGRIR la marque là où elle est la plus vue.
 *
 * D'où la règle : `max(plancher, épaisseur d'origine)`. Au-delà de 64 px de rendu,
 * le mark est **strictement identique à ce qu'il était** ; en dessous, le trait
 * cesse seulement de tomber sous le pixel. On ne répare que ce qui était cassé.
 *
 * 0,75 px n'est pas 1 px à dessein : sur les écrans où la marque vit le plus
 * (DPR ≥ 2), il fait 1,5 à 2,25 pixels physiques — net, sans cerner.
 */
const STROKE_FLOOR_PX = 0.75;

/**
 * L'épaisseur à appliquer pour une taille de rendu donnée.
 *
 * Exportée pour que le call site la calcule à partir de `size` : le mark, lui,
 * vit en `size-full` et ne connaît pas ses propres pixels.
 */
export function logoStrokeWidth(sizePx: number): number {
	return Math.max(STROKE_FLOOR_PX, (sizePx * STROKE_USER_UNITS) / 256);
}

/** Les étincelles gardent leur rapport d'origine au trait principal (2/3). */
const SPARK_STROKE = "calc(var(--logo-stroke) * 0.67)";

function Sparkle({ side, className }: { side: "left" | "right"; className?: string }) {
	const anchor = SPARK_ANCHORS[side];
	return (
		<path
			d={side === "left" ? SPARK_LEFT_PATH : SPARK_RIGHT_PATH}
			fill="#ffffff"
			stroke="var(--logo-ink)"
			strokeLinejoin="round"
			vectorEffect="non-scaling-stroke"
			className={className}
			style={{
				strokeWidth: SPARK_STROKE,
				// L'origine de transformation est le centre de l'étoile, pas celui de la
				// boîte : sans ça, un `scale` la ferait dériver au lieu de scintiller.
				// En unités de viewBox — `transform-box` vaut `view-box` par défaut sur
				// un élément SVG, c'est aussi ce qui garde les `translate-*` en % de la
				// boîte, à l'identique de l'ancienne structure à trois `<svg>`.
				transformOrigin: `${anchor.x * 256}px ${anchor.y * 256}px`,
			}}
		/>
	);
}

export function LogoMark({
	className,
	sparkles = "inside",
	detail = "full",
	strokePx = STROKE_FLOOR_PX,
	animated = false,
}: LogoMarkProps) {
	const escaping = sparkles === "escaping";

	return (
		<span
			className={cn("relative block", className)}
			style={
				{
					// Le socle et le cœur sont des JETONS de marque — c'est tout l'objet du
					// passage au vectoriel : le rose du logo et le rose du site deviennent
					// la même valeur, au lieu d'être l'un cuit dans un bitmap et l'autre en
					// CSS. Surchargeables par le call site (une salle, un e-mail sombre…).
					"--logo-disc": "var(--primary)",
					"--logo-heart": "var(--secondary)",
					// ⚠️ La seule couleur du dessin qui n'a PAS de jeton : le brun chaud du
					// feutre, mesuré sur le raster. Ce n'est pas `--foreground` (bleu-noir,
					// #06070b) — les confondre refroidirait tout le tracé. Lui donner un
					// jeton relève d'une décision de design system, pas de ce composant.
					"--logo-ink": "#4c2420",
					"--logo-stroke": `${strokePx}px`,
				} as React.CSSProperties
			}
		>
			<svg
				viewBox="0 0 256 256"
				// `overflow-visible` : un `<svg>` découpe sa viewBox par défaut, et c'est
				// ce qui autorise les étincelles à sortir du socle sans conteneur tiers.
				// `pointer-events-none` : en `escaping`, une étincelle dépasse la boîte du
				// lien. Sans ça, elle capterait des clics là où rien ne l'annonce.
				className="pointer-events-none absolute inset-0 size-full overflow-visible"
				aria-hidden="true"
				focusable="false"
				// Un logo garde ses couleurs en contraste forcé — c'est le cas d'usage
				// canonique de la propriété. Sans ça, Windows repeint le mark en deux
				// tons système et il n'en reste qu'une tache.
				style={{ forcedColorAdjust: "none" }}
			>
				{/* Socle + cœur + initiale viennent du sprite monté dans `app/layout.tsx` :
				    ces trois chemins pèsent 3,4 Ko et la page storefront rend le mark
				    trois fois. Les jetons posés ci-dessus traversent le `<use>`.
				    Cf. `shared/components/icons/icon-sprite.tsx`. */}
				<use href="#logo-mark-body" />
				{/* Le reflet est peint APRÈS l'initiale, ce qui est sans effet : il vit
				    sur le lobe supérieur gauche (x 62→79), l'initiale au centre
				    (x 104→154). Les deux ne se recouvrent jamais. */}
				{detail === "full" && <path d={GLOSS_PATH} fill="#ffffff" opacity={0.5} />}
				{!escaping && (
					<>
						<Sparkle side="left" />
						<Sparkle side="right" />
					</>
				)}
				{escaping && (
					<>
						{/* Hors du disque : décalées vers l'extérieur le long de leur propre
						    diagonale, et agrandies — une étincelle qui sort doit se lire comme
						    un échappement, pas comme un débordement accidentel. */}
						<Sparkle
							side="left"
							className={cn(
								"-translate-x-[9%] translate-y-[7%] scale-[1.12]",
								animated &&
									"motion-safe:transition-transform motion-safe:duration-500 motion-safe:[transition-timing-function:cubic-bezier(0.34,1.2,0.64,1)]",
								animated &&
									"motion-safe:group-hover/logo:-translate-x-[13%] motion-safe:group-hover/logo:translate-y-[10%] motion-safe:group-hover/logo:scale-[1.26]",
								animated &&
									"motion-safe:group-focus-visible/logo:-translate-x-[13%] motion-safe:group-focus-visible/logo:translate-y-[10%] motion-safe:group-focus-visible/logo:scale-[1.26]",
							)}
						/>
						<Sparkle
							side="right"
							className={cn(
								"translate-x-[8%] -translate-y-[8%] scale-[1.12]",
								animated &&
									"motion-safe:transition-transform motion-safe:duration-500 motion-safe:[transition-timing-function:cubic-bezier(0.34,1.2,0.64,1)]",
								animated &&
									"motion-safe:group-hover/logo:translate-x-[12%] motion-safe:group-hover/logo:-translate-y-[12%] motion-safe:group-hover/logo:scale-[1.26]",
								animated &&
									"motion-safe:group-focus-visible/logo:translate-x-[12%] motion-safe:group-focus-visible/logo:-translate-y-[12%] motion-safe:group-focus-visible/logo:scale-[1.26]",
							)}
						/>
					</>
				)}
			</svg>
		</span>
	);
}
