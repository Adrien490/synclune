import { cn } from "@/shared/utils/cn";

import {
	FIVE_PATH,
	GLOSS_PATH,
	HEART_PATH,
	SPARK_ANCHORS,
	SPARK_LEFT_PATH,
	SPARK_RIGHT_PATH,
} from "./logo-mark.paths";

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
 * Ici le socle est une **surface CSS** (`--logo-disc`), l'encre un jeton local
 * (`--logo-ink`), et le « 5 » est une **découpe** : il laisse voir le socle au
 * travers, exactement comme dans le dessin d'origine. Recolorer le disque
 * recolore donc le « 5 » sans rien d'autre à faire.
 *
 * Corollaires : zéro requête, zéro transformation `/_next/image` facturée, zéro
 * CLS, et net à toute taille — le raster, lui, était déjà agrandi par le
 * navigateur dès 96 px sur un écran ×3, sa source ne faisant que 256 px.
 */
interface LogoMarkProps {
	/** Classe du disque. La taille vient du call site. */
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
	/** Anime les étincelles au survol et au focus de l'ancêtre marqué `group/logo`. */
	animated?: boolean;
}

/** Le cœur, son reflet et le « 5 » — tout ce qui reste DANS le disque. */
function MarkBody() {
	return (
		<svg
			viewBox="0 0 256 256"
			className="absolute inset-0 size-full"
			aria-hidden="true"
			focusable="false"
		>
			<path
				d={HEART_PATH}
				fill="var(--logo-heart)"
				stroke="var(--logo-ink)"
				strokeWidth={3}
				strokeLinejoin="round"
			/>
			<path d={GLOSS_PATH} fill="#ffffff" opacity={0.5} />
			{/* `fill-rule="evenodd"` : le « 5 » a des contre-formes (la boucle, la
			    barre) qui doivent rester creuses pour laisser passer le socle. */}
			<path
				d={FIVE_PATH}
				fill="var(--logo-disc)"
				stroke="var(--logo-ink)"
				strokeWidth={3}
				strokeLinejoin="round"
				fillRule="evenodd"
			/>
		</svg>
	);
}

function Sparkle({ side, className }: { side: "left" | "right"; className?: string }) {
	const anchor = SPARK_ANCHORS[side];
	return (
		<svg
			viewBox="0 0 256 256"
			className={cn("pointer-events-none absolute inset-0 size-full overflow-visible", className)}
			aria-hidden="true"
			focusable="false"
			// L'origine de transformation est le centre de l'étoile, pas celui de la
			// boîte : sans ça, un `scale` la ferait dériver au lieu de scintiller.
			style={{ transformOrigin: `${anchor.x * 100}% ${anchor.y * 100}%` }}
		>
			<path
				d={side === "left" ? SPARK_LEFT_PATH : SPARK_RIGHT_PATH}
				fill="#ffffff"
				stroke="var(--logo-ink)"
				strokeWidth={2}
				strokeLinejoin="round"
			/>
		</svg>
	);
}

export function LogoMark({ className, sparkles = "inside", animated = false }: LogoMarkProps) {
	const escaping = sparkles === "escaping";

	return (
		// `overflow-visible` sur l'enveloppe, `overflow-hidden` sur le seul disque :
		// c'est ce découplage qui autorise les étincelles à sortir sans que le cœur
		// déborde de son socle.
		<span
			className={cn("relative block overflow-visible", className)}
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
				} as React.CSSProperties
			}
		>
			<span
				className="absolute inset-0 block overflow-hidden rounded-full bg-(--logo-disc)"
				aria-hidden="true"
			>
				<MarkBody />
			</span>
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
		</span>
	);
}
