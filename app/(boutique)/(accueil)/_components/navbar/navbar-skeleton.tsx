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
			className="fixed top-0 inset-x-0 z-40 transition-all duration-300 ease-out border-b bg-transparent border-transparent"
			aria-busy="true"
			aria-label="Chargement de la navigation"
		>
			<nav
				aria-label="Navigation principale en cours de chargement"
				className="transition-all duration-300 ease-in-out"
			>
				<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
					<div className="flex h-16 sm:h-20 items-center gap-4">
						{/* Section gauche: Menu burger (mobile) / Logo (desktop) */}
						<div className="flex flex-1 items-center lg:flex-none">
							{/* Menu burger skeleton (mobile uniquement) - size-11 = 44px matches real burger */}
							<div className="lg:hidden size-11 animate-pulse bg-muted/60 rounded-xl" />

							{/* Logo skeleton (desktop uniquement) */}
							<div className="hidden lg:flex items-center gap-3">
								{/* Icône logo - size-12 = 48px matches Logo size={48} */}
								<div className="size-12 animate-pulse bg-muted/60 rounded-lg" />
								{/* Texte "SYNCLUNE" */}
								<div className="h-6 w-24 animate-pulse bg-muted/60 rounded-md" />
							</div>
						</div>

						{/* Section centrale: Logo (mobile) / Navigation desktop */}
						<div className="flex items-center justify-center lg:flex-1">
							{/* Logo skeleton centré (mobile uniquement) - size-11 = 44px matches Logo size={44} */}
							<div className="lg:hidden size-11 animate-pulse bg-muted/60 rounded-lg" />

							{/* Navigation desktop skeleton (cachée sur mobile) */}
							{/* 3 items: Les créations, Les collections, Personnalisation (synchronisé avec getDesktopNavItems) */}
							<div className="hidden lg:flex items-center gap-1">
								<div className="h-9 w-24 animate-pulse bg-muted/60 rounded-lg" />
								<div className="h-9 w-28 animate-pulse bg-muted/60 rounded-lg" />
								<div className="h-9 w-28 animate-pulse bg-muted/60 rounded-lg" />
							</div>
						</div>

						{/* Section droite: Favoris + Recherche + Compte + Panier */}
						<div className="flex flex-1 items-center justify-end">
							<div className="flex items-center gap-2 sm:gap-3">
								{/* Icône favoris skeleton (toujours visible) */}
								<div className="size-11 animate-pulse bg-muted/60 rounded-xl" />

								{/* Icône recherche skeleton (visible sur sm+ seulement) */}
								<div className="hidden sm:inline-flex size-11 animate-pulse bg-muted/60 rounded-xl" />

								{/* Icône compte skeleton (visible sur sm+ seulement) */}
								<div className="hidden sm:inline-flex size-11 animate-pulse bg-muted/60 rounded-xl" />

								{/* Icône panier skeleton (toujours visible) */}
								<div className="size-11 animate-pulse bg-muted/60 rounded-xl" />
							</div>
						</div>
					</div>
				</div>
			</nav>
		</header>
	);
}
