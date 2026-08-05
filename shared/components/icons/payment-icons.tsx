/**
 * Icônes de moyens de paiement (footer + `ProductReassurance`).
 *
 * Grayscale, ratio carte bancaire (32×20). Ce sont des approximations dessinées à
 * la main, pas les artworks officiels des réseaux — c'est assumé, elles servent de
 * repère visuel, pas de reproduction de marque.
 *
 * ⚠️ **La carte est un CONTOUR (`fill="none"`), jamais un aplat blanc.** Elle a
 * porté `fill="white"` en dur jusqu'au 2026-08-05 : sur `--background`
 * (`oklch(0.99 …)`), ce blanc donnait **1,03:1** — autrement dit la silhouette de
 * la carte n'existait pas, et les opacités des glyphes se calculaient contre un
 * blanc qui n'était pas celui qu'on voyait. Un aplat en dur casserait de toute
 * façon sur n'importe quel fond non blanc (le composant sert aussi la PDP).
 *
 * Les opacités sont **calculées, pas choisies à l'œil** : tout ce qui porte
 * l'identité d'un réseau vise ≥ 3:1 sur `--background` (le seuil WCAG 1.4.11 des
 * objets graphiques — les logotypes en sont exemptés, mais un repère de confiance
 * qu'on ne distingue pas ne rassure personne). Ce qui n'est que structure (contour
 * de carte, bande magnétique) reste volontairement en dessous, pour ne pas
 * transformer trois marques discrètes en trois boîtes dures.
 *
 * `currentColor` = `--muted-foreground` sur les deux surfaces d'appel. Changer la
 * couleur héritée invalide ces calculs.
 */

interface PaymentIconProps {
	className?: string;
	"aria-label"?: string;
}

export function VisaIcon({ className = "", "aria-label": ariaLabel = "Visa" }: PaymentIconProps) {
	return (
		<svg
			width="32"
			height="20"
			viewBox="0 0 32 20"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
			role="img"
			aria-label={ariaLabel}
		>
			<title>{ariaLabel}</title>
			<rect
				x="0.5"
				y="0.5"
				width="31"
				height="19"
				rx="2.5"
				fill="none"
				stroke="currentColor"
				strokeOpacity="0.5"
			/>
			<path
				d="M13.5 13.5L14.8 6.5H16.5L15.2 13.5H13.5ZM11.5 6.5L9.8 11.3L9.5 10L8.7 7.2C8.6 6.8 8.3 6.5 7.8 6.5H5.2L5.1 6.7C5.9 6.9 6.6 7.2 7.2 7.5L8.8 13.5H10.7L13.3 6.5H11.5ZM24.5 13.5H26.2L24.7 6.5H23.3C22.9 6.5 22.6 6.7 22.4 7.1L19.5 13.5H21.4L21.8 12.4H24.1L24.5 13.5ZM22.3 10.9L23.3 8.2L23.9 10.9H22.3ZM19.2 8.7L19.5 6.7C18.9 6.5 18.2 6.3 17.5 6.3C16.1 6.3 15.1 7.1 15.1 8.2C15.1 9.1 15.9 9.6 16.6 9.9C17.3 10.2 17.5 10.5 17.5 10.8C17.5 11.3 16.9 11.5 16.4 11.5C15.6 11.5 15.1 11.4 14.4 11L14.1 13C14.6 13.2 15.5 13.4 16.3 13.4C17.9 13.4 18.9 12.6 18.9 11.4C18.9 10 17.1 9.9 17.1 9C17.1 8.6 17.4 8.3 18.1 8.3C18.5 8.3 18.9 8.4 19.2 8.7Z"
				fill="currentColor"
				fillOpacity="0.7"
			/>
		</svg>
	);
}

export function MastercardIcon({
	className = "",
	"aria-label": ariaLabel = "Mastercard",
}: PaymentIconProps) {
	return (
		<svg
			width="32"
			height="20"
			viewBox="0 0 32 20"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
			role="img"
			aria-label={ariaLabel}
		>
			<title>{ariaLabel}</title>
			<rect
				x="0.5"
				y="0.5"
				width="31"
				height="19"
				rx="2.5"
				fill="none"
				stroke="currentColor"
				strokeOpacity="0.5"
			/>
			{/* Les deux disques gardent des opacités DISTINCTES, et leur intersection est
			    plus dense que les deux : c'est ce qui fait lire « deux cercles qui se
			    chevauchent » plutôt qu'une forme unique. 3,49:1 / 2,54:1 / 4,95:1. */}
			<circle cx="12" cy="10" r="5" fill="currentColor" fillOpacity="0.7" />
			<circle cx="20" cy="10" r="5" fill="currentColor" fillOpacity="0.55" />
			<path
				d="M16 6.34C17.2 7.28 18 8.74 18 10.4C18 12.06 17.2 13.52 16 14.46C14.8 13.52 14 12.06 14 10.4C14 8.74 14.8 7.28 16 6.34Z"
				fill="currentColor"
				fillOpacity="0.85"
			/>
		</svg>
	);
}

export function CBIcon({
	className = "",
	"aria-label": ariaLabel = "Carte Bancaire",
}: PaymentIconProps) {
	return (
		<svg
			width="32"
			height="20"
			viewBox="0 0 32 20"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
			role="img"
			aria-label={ariaLabel}
		>
			<title>{ariaLabel}</title>
			<rect
				x="0.5"
				y="0.5"
				width="31"
				height="19"
				rx="2.5"
				fill="none"
				stroke="currentColor"
				strokeOpacity="0.5"
			/>
			{/* Bande magnétique : structure pure, volontairement la plus pâle (1,60:1). */}
			<rect x="4" y="4" width="24" height="5" rx="1" fill="currentColor" fillOpacity="0.3" />
			<rect x="4" y="11" width="10" height="2" rx="0.5" fill="currentColor" fillOpacity="0.65" />
			<rect x="4" y="14" width="6" height="2" rx="0.5" fill="currentColor" fillOpacity="0.5" />
			{/* « CB » porte l'identité du réseau : c'est l'élément le plus dense (4,19:1). */}
			<text
				x="23"
				y="15"
				fontSize="5"
				fontWeight="bold"
				fill="currentColor"
				fillOpacity="0.78"
				fontFamily="system-ui"
			>
				CB
			</text>
		</svg>
	);
}
