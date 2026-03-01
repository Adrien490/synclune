/**
 * Skeleton de la Navbar pour le fallback de Suspense
 *
 * Reproduit exactement la structure de la navbar refactorée:
 * - Mobile: Menu burger à gauche, Logo centré (icône seule), Actions à droite
 * - Desktop: Logo avec texte à gauche, Navigation centrale, Actions à droite
 *
 * Container: max-w-6xl (cohérent avec navbar.tsx)
 * Hauteur: h-16 sm:h-20 (cohérent avec navbar.tsx)
 */
export function NavbarSkeleton() {
	return (
		<header
			className="fixed inset-x-0 top-[var(--announcement-bar-height)] z-40 border-b border-transparent bg-transparent pt-[env(safe-area-inset-top)] transition-all duration-300 ease-out"
			aria-busy="true"
			aria-label="Chargement de la navigation"
		>
			<nav
				aria-label="Navigation principale en cours de chargement"
				className="transition-all duration-300 ease-in-out"
			>
				<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
					<div className="flex h-16 items-center gap-4 sm:h-20">
						{/* Section gauche: Menu burger (mobile) / Logo (desktop) */}
						<div className="flex min-w-0 flex-1 items-center lg:flex-none">
							{/* Menu burger skeleton (mobile uniquement) - size-11 = 44px matches real burger */}
							<div className="bg-muted/60 size-11 rounded-xl motion-safe:animate-pulse lg:hidden" />

							{/* Search icon skeleton (mobile only - between burger and logo) */}
							<div className="bg-muted/60 size-11 rounded-xl motion-safe:animate-pulse sm:hidden" />

							{/* Logo skeleton (desktop uniquement) */}
							<div className="hidden items-center gap-3 lg:flex">
								{/* Icône logo - size-12 = 48px matches Logo size={48} */}
								<div className="bg-muted/60 size-12 rounded-lg motion-safe:animate-pulse" />
								{/* Texte "SYNCLUNE" */}
								<div className="bg-muted/60 h-6 w-24 rounded-md motion-safe:animate-pulse" />
							</div>
						</div>

						{/* Section centrale: Logo (mobile) / Navigation desktop */}
						<div className="flex items-center justify-center lg:flex-1">
							{/* Logo skeleton centré (mobile uniquement) - size-11 = 44px matches Logo size={44} */}
							<div className="bg-muted/60 size-11 rounded-lg motion-safe:animate-pulse lg:hidden" />

							{/* Navigation desktop skeleton (cachée sur mobile) */}
							{/* 3 items: Les créations, Les collections, Personnalisation (synchronisé avec getDesktopNavItems) */}
							<div className="hidden items-center gap-1 lg:flex">
								<div className="bg-muted/60 h-9 w-24 rounded-lg motion-safe:animate-pulse" />
								<div className="bg-muted/60 h-9 w-28 rounded-lg motion-safe:animate-pulse" />
								<div className="bg-muted/60 h-9 w-28 rounded-lg motion-safe:animate-pulse" />
							</div>
						</div>

						{/* Section droite: Favoris + Recherche + Compte + Panier */}
						<div className="flex min-w-0 flex-1 items-center justify-end">
							<div className="flex items-center gap-2 sm:gap-3">
								{/* Icône favoris skeleton (toujours visible) */}
								<div className="bg-muted/60 size-11 rounded-xl motion-safe:animate-pulse" />

								{/* Icône recherche skeleton (visible sur sm+ seulement) */}
								<div className="bg-muted/60 hidden size-11 rounded-xl motion-safe:animate-pulse sm:inline-flex" />

								{/* Icône compte skeleton (visible sur sm+ seulement) */}
								<div className="bg-muted/60 hidden size-11 rounded-xl motion-safe:animate-pulse sm:inline-flex" />

								{/* Icône panier skeleton (toujours visible) */}
								<div className="bg-muted/60 size-11 rounded-xl motion-safe:animate-pulse" />
							</div>
						</div>
					</div>
				</div>
			</nav>
		</header>
	);
}
