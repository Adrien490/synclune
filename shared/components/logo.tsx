"use client";

import { BRAND } from "@/shared/constants/brand";
import { cn } from "@/shared/utils/cn";
import Link from "next/link";

import { LogoMark, logoStrokeWidth } from "./logo-mark";

/**
 * La marque est un DISQUE, toujours.
 *
 * Il y avait une prop `rounded` à quatre valeurs. `md` et `none` n'ont jamais eu
 * d'appelant, et `lg` en avait UN — le rail admin, à `size={40}`. Or
 * `--radius-lg` vaut `1.25rem` = 20 px : sur une boîte de 40 px, un rayon de
 * 20 px EST un cercle. La prop, sa table de classes et le test qui la
 * verrouillait décrivaient donc une distinction que personne n'a jamais pu voir.
 */
const DISC_CLASS = "rounded-full";

/**
 * En dessous de cette taille de rendu, le mark passe en détail réduit.
 *
 * Le seuil est celui de `size`, pas de `sizeMd` : les deux appelants qui montent
 * au breakpoint restent du même côté (28 → 36 en tunnel, 40 → 48 au footer), et
 * un reflet de 2 px qui n'apparaîtrait qu'à partir de `md` ne se remarque pas.
 * Cf. `LogoMark`, prop `detail`.
 */
const COMPACT_DETAIL_THRESHOLD_PX = 40;

// `brandLinkLabel` vit dans `brand-link-label.ts` (module SERVEUR — les Server
// Components l'appellent) et reste ré-exporté ici pour les consommateurs clients.
import { brandLinkLabel } from "@/shared/components/brand-link-label";
export { brandLinkLabel };

/**
 * Le nom de la marque, dessiné. SSOT de sa typographie.
 *
 * `font-cursive` (Kalam) est un usage EXPLICITEMENT autorisé pour un nom
 * de marque (`shared/styles/fonts.ts`) — mais la police est mono-poids : jamais
 * `font-bold`/`font-semibold`, jamais `italic` (faux-oblique sur un script déjà
 * incliné).
 *
 * `tracking-wide` est intentionnel et sans danger : la crainte qu'un
 * interlettrage positif rompe les liaisons d'une script LIÉE a été testée
 * (rendu ×8, seuillage, comptage des composantes connexes d'encre) et
 * infirmée — 8 composantes contre 8 à 24 px, 6 contre 6 à 20 px, contre-formes
 * identiques. Il ne restait qu'une incohérence de largeur de 6,3 % entre les
 * surfaces qui le posaient et celle qui ne le posait pas ; ce composant la
 * ferme.
 *
 * La TAILLE vient du call site : elle dépend du chrome qui accueille la marque,
 * pas de la marque elle-même. `text-xl` n'est qu'un repli — à ne pas confondre
 * avec l'échelle à cinq paliers qui vivait ici et que `Logo` dérivait de
 * `size` : ses DEUX seuls appelants l'écrasaient tous les deux, elle n'a jamais
 * rendu un pixel.
 */
export function LogoWordmark({ className }: { className?: string }) {
	return (
		<span
			className={cn("font-cursive text-foreground text-xl font-normal tracking-wide", className)}
		>
			{BRAND.name}
		</span>
	);
}

interface LogoProps {
	size?: number;
	/** Optional larger size applied at `md` breakpoint (768px+). Avoids dual-render anti-pattern. */
	sizeMd?: number;
	href?: string;
	className?: string;
	showText?: boolean;
	textClassName?: string;
	shadow?: boolean;
	/**
	 * Les étincelles débordent-elles du socle ? Cf. `LogoMark`.
	 *
	 * `"escaping"` est le geste de la direction « L'étincelle » : la silhouette
	 * cesse d'être un rond parfait, et la marque se reconnaît plus vite à taille
	 * égale — c'est l'effet secondaire le plus utile aux petites tailles, là où le
	 * cœur ne se détachait de son disque que de 1,26:1.
	 *
	 * Convention d'usage (audit 2026-08-05) : `"escaping"` est réservé à la
	 * NAVBAR — la devanture, là où la marque doit accrocher. Toutes les autres
	 * surfaces (footer, tunnels, page fermeture) gardent le rond parfait du
	 * défaut. Les deux silhouettes co-visibles sur la home sont donc un choix :
	 * signature vive en tête de page, sceau discret ailleurs.
	 */
	sparkles?: "inside" | "escaping";
	/**
	 * Nom de View Transition posé sur le wrapper de l'image.
	 *
	 * ⚠️ **Aucune navigation interne ne peut le déclencher aujourd'hui.**
	 * `experimental.viewTransition` n'est pas activé dans `next.config.ts`, et
	 * `react-dom-client.production.js` — le build réellement envoyé au navigateur —
	 * ne contient AUCUNE occurrence de `startViewTransition` (le support ne vit que
	 * dans les runtimes `*-experimental`). Le seul mécanisme actif est le
	 * `@view-transition { navigation: auto }` d'`app/styles/pwa.css`, qui ne couvre
	 * que les navigations CROSS-DOCUMENT — or l'App Router navigue côté client.
	 *
	 * La prop est conservée malgré tout : ce n'est pas une dette du logo mais une
	 * convention du dépôt, présente sur ~140 éléments (cartes admin, galerie,
	 * tunnel de paiement…). La trancher ici seul créerait une incohérence sans rien
	 * réparer. Le vrai arbitrage — activer le flag, ou retirer la convention — est
	 * un chantier à part.
	 */
	viewTransitionName?: string;
	/** Override the generated aria-label (cf. `brandLinkLabel`). */
	ariaLabel?: string;
}

export function Logo({
	size = 48,
	sizeMd,
	href,
	className,
	showText = false,
	textClassName,
	shadow = false,
	sparkles = "inside",
	viewTransitionName,
	ariaLabel,
}: LogoProps) {
	const linkClassName = cn(
		// `group/logo` NOMMÉ, jamais nu : un groupe anonyme deviendrait le premier
		// ancêtre `.group` de tous ses descendants et capterait leurs variants —
		// le bug déjà payé sur le `<header>` de la navbar.
		"group/logo focus-ring inline-flex items-center",
		// Touch target minimum 44px (WCAG 2.5.5) — only in icon-only mode.
		// With showText, the text itself is the affordance and the extra min-h
		// would misalign with adjacent navbar icons.
		!showText && "min-w-11 min-h-11",
		DISC_CLASS,
	);

	const logoContent = (
		<div className={cn("flex items-center gap-3", className)}>
			<span
				className={cn(
					"relative block",
					// Ombre STATIQUE, sans transition : rien ne module jamais `filter` ici,
					// et une `transition-[filter]` serait de toute façon écrasée par la
					// `transition-transform` de la branche `href` (deux utilitaires
					// `transition-*` ne se cumulent pas — le dernier émis remplace la liste).
					shadow && "drop-shadow-md",
					// Hover/active scale on the visual wrapper, not the anchor —
					// decouples from the navbar's scroll-compact transform.
					//
					// ⚠️ Seulement quand le logo EST un lien. Sans `href` il ne mène nulle
					// part : le grossissement n'annonce alors aucune action, et une
					// micro-animation sans fonction est précisément ce que le dépôt refuse
					// (c'est pour ce motif que le `scale-90` du logo au scroll a été
					// supprimé). Les appelants sans `href` qui vivent DANS un lien — le rail
					// admin — reçoivent déjà le retour de survol de leur propre bouton.
					href && [
						"motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out",
						// ⚠️ Le retour presse est DOUBLÉ en `can-hover:active:`. Au clic
						// maintenu sur pointeur fin, `:hover` et `:active` sont vrais ensemble,
						// pilotent la même propriété `scale` à spécificité égale, et la règle
						// `can-hover:hover` est émise APRÈS le `active:` nu dans le CSS
						// compilé — sans le doublon, le survol gagne et le 0.98 n'apparaît
						// jamais (mesuré : scale restait à 1.02 pendant le mousedown). Le
						// `active:` nu reste pour le tactile, où `:hover` n'existe pas. Même
						// mécanique que la galerie partagée.
						"motion-safe:can-hover:hover:scale-[1.02] motion-safe:active:scale-[0.98]",
						"motion-safe:can-hover:active:scale-[0.98]",
					],
					sizeMd && "md:!h-(--logo-size-md) md:!w-(--logo-size-md)",
				)}
				style={{
					width: size,
					height: size,
					viewTransitionName,
					...(sizeMd ? ({ "--logo-size-md": `${sizeMd}px` } as React.CSSProperties) : undefined),
				}}
			>
				<LogoMark
					className="size-full"
					sparkles={sparkles}
					detail={size < COMPACT_DETAIL_THRESHOLD_PX ? "compact" : "full"}
					strokePx={logoStrokeWidth(size)}
					animated={Boolean(href)}
				/>
			</span>
			{showText && <LogoWordmark className={textClassName} />}
			{/* L'image portait le nom accessible via son `alt`. En SVG décoratif, il
			    faut le rendre explicitement — mais SEULEMENT quand rien d'autre ne nomme
			    la marque : avec le wordmark, c'est LUI le texte ; avec `href`, l'ancre
			    porte déjà `aria-label` et ce span serait relu en traversée (la marque
			    annoncée deux fois — mesuré sur l'arbre AX du footer). */}
			{!showText && !href && <span className="sr-only">{BRAND.logo.alt}</span>}
		</div>
	);

	if (href) {
		return (
			<Link href={href} className={linkClassName} aria-label={ariaLabel ?? brandLinkLabel(href)}>
				{logoContent}
			</Link>
		);
	}

	return logoContent;
}
