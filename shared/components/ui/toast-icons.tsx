/**
 * Icônes bijoux raffinées partagées entre Sonner toaster (desktop) et
 * MicroToast pastille (mobile). Stroke 1.5, taille 18px.
 *
 * Métaphores :
 * - success  : diamant + sparkle doré
 * - info     : cercle informatif minimaliste
 * - error    : coeur brisé rouge (text-destructive, statique) — sémantique d'alerte
 *              alignée sur le border-left destructive du toast Sonner desktop.
 * - warning  : étoile dorée (animation sparkle-pulse)
 * - loading  : anneau + sparkle (animation spin)
 * - wishlist : cœur plein + sparkle (mobile uniquement via `microVariant`)
 * - cart     : sac bijou (mobile uniquement via `microVariant`)
 * - discount : étiquette % + sparkle (mobile uniquement via `microVariant`)
 */

export const toastIcons = {
	success: (
		<div className="relative" aria-hidden="true">
			<svg
				className="text-primary size-[18px]"
				viewBox="0 0 24 24"
				fill="none"
				strokeWidth="1.5"
				stroke="currentColor"
			>
				<path strokeLinecap="round" strokeLinejoin="round" d="M12 3L4 9l8 12 8-12-8-6z" />
				<path strokeLinecap="round" strokeLinejoin="round" d="M4 9h16" />
				<path strokeLinecap="round" strokeLinejoin="round" d="M8.5 9L12 21l3.5-12" />
			</svg>
			<svg
				className="text-secondary animate-sparkle-pulse absolute -top-0.5 -right-0.5 size-2"
				viewBox="0 0 24 24"
				fill="currentColor"
			>
				<path d="M12 0L13.5 9L24 12L13.5 15L12 24L10.5 15L0 12L10.5 9L12 0Z" />
			</svg>
		</div>
	),
	info: (
		<div className="relative" aria-hidden="true">
			<svg
				className="text-foreground/80 size-[18px]"
				viewBox="0 0 24 24"
				fill="none"
				strokeWidth="1.5"
				stroke="currentColor"
			>
				<circle cx="12" cy="12" r="9" />
				<path strokeLinecap="round" strokeLinejoin="round" d="M12 11v5" />
				<circle cx="12" cy="8" r="0.6" fill="currentColor" stroke="none" />
			</svg>
		</div>
	),
	error: (
		<div className="relative" aria-hidden="true">
			<svg
				className="text-destructive size-[18px]"
				viewBox="0 0 24 24"
				fill="none"
				strokeWidth="1.5"
				stroke="currentColor"
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					d="M12 21C12 21 4 14 4 8.5C4 5.5 6.5 3 9.5 3C11 3 12 4 12 4C12 4 13 3 14.5 3C17.5 3 20 5.5 20 8.5C20 14 12 21 12 21Z"
				/>
				<path strokeLinecap="round" strokeLinejoin="round" d="M12 4L10 10L14 12L12 21" />
			</svg>
		</div>
	),
	warning: (
		<div className="relative" aria-hidden="true">
			<svg
				className="text-secondary size-[18px]"
				viewBox="0 0 24 24"
				fill="none"
				strokeWidth="1.5"
				stroke="currentColor"
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					d="M12 2L14 8.5L21 9L16 14L17.5 21L12 17.5L6.5 21L8 14L3 9L10 8.5L12 2Z"
				/>
				<circle cx="12" cy="12" r="1.5" fill="none" stroke="currentColor" />
			</svg>
			<svg
				className="text-secondary animate-sparkle-pulse absolute -top-0.5 -right-0.5 size-1.5"
				style={{ animationDelay: "1s" }}
				viewBox="0 0 24 24"
				fill="currentColor"
			>
				<path d="M12 0L13.5 9L24 12L13.5 15L12 24L10.5 15L0 12L10.5 9L12 0Z" />
			</svg>
		</div>
	),
	loading: (
		<div className="relative size-[18px]" aria-hidden="true">
			<svg
				className="text-primary/30 size-full"
				viewBox="0 0 24 24"
				fill="none"
				strokeWidth="1.5"
				stroke="currentColor"
			>
				<circle cx="12" cy="12" r="8" />
			</svg>
			<svg
				className="text-primary absolute inset-0 size-full animate-spin"
				viewBox="0 0 24 24"
				fill="none"
				strokeWidth="1.5"
				stroke="currentColor"
			>
				<path strokeLinecap="round" d="M12 4a8 8 0 0 1 6.93 4" />
			</svg>
			<svg
				className="text-primary/40 animate-sparkle-pulse absolute -top-0.5 -right-0.5 size-1.5"
				style={{ animationDelay: "0.5s" }}
				viewBox="0 0 24 24"
				fill="currentColor"
			>
				<path d="M12 0L13.5 9L24 12L13.5 15L12 24L10.5 15L0 12L10.5 9L12 0Z" />
			</svg>
		</div>
	),
	wishlist: (
		<div className="relative" aria-hidden="true">
			<svg
				className="text-primary size-[18px]"
				viewBox="0 0 24 24"
				fill="currentColor"
				strokeWidth="1.5"
				stroke="currentColor"
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					d="M12 21C12 21 4 14 4 8.5C4 5.5 6.5 3 9.5 3C11 3 12 4 12 4C12 4 13 3 14.5 3C17.5 3 20 5.5 20 8.5C20 14 12 21 12 21Z"
				/>
			</svg>
			<svg
				className="text-secondary animate-sparkle-pulse absolute -top-0.5 -right-0.5 size-2"
				viewBox="0 0 24 24"
				fill="currentColor"
			>
				<path d="M12 0L13.5 9L24 12L13.5 15L12 24L10.5 15L0 12L10.5 9L12 0Z" />
			</svg>
		</div>
	),
	cart: (
		<div className="relative" aria-hidden="true">
			<svg
				className="text-primary size-[18px]"
				viewBox="0 0 24 24"
				fill="none"
				strokeWidth="1.5"
				stroke="currentColor"
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					d="M5 8h14l-1.5 11a2 2 0 0 1-2 1.75H8.5a2 2 0 0 1-2-1.75L5 8z"
				/>
				<path strokeLinecap="round" strokeLinejoin="round" d="M9 8V6a3 3 0 1 1 6 0v2" />
			</svg>
			<svg
				className="text-secondary animate-sparkle-pulse absolute -top-0.5 -right-0.5 size-1.5"
				viewBox="0 0 24 24"
				fill="currentColor"
			>
				<path d="M12 0L13.5 9L24 12L13.5 15L12 24L10.5 15L0 12L10.5 9L12 0Z" />
			</svg>
		</div>
	),
	discount: (
		<div className="relative" aria-hidden="true">
			<svg
				className="text-secondary size-[18px]"
				viewBox="0 0 24 24"
				fill="none"
				strokeWidth="1.5"
				stroke="currentColor"
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					d="M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9-9-9z"
				/>
				<circle cx="8" cy="8" r="1.4" fill="currentColor" stroke="none" />
				<path strokeLinecap="round" d="M15 9l-6 6" />
			</svg>
			<svg
				className="text-primary animate-sparkle-pulse absolute -top-0.5 -right-0.5 size-2"
				viewBox="0 0 24 24"
				fill="currentColor"
			>
				<path d="M12 0L13.5 9L24 12L13.5 15L12 24L10.5 15L0 12L10.5 9L12 0Z" />
			</svg>
		</div>
	),
};

export type ToastVariant = keyof typeof toastIcons;
