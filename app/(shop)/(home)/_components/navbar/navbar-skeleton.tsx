/**
 * Skeleton de la Navbar pour le fallback de Suspense
 *
 * Reproduit exactement la structure de la navbar réelle :
 * - Mobile: Menu burger à gauche, Logo + nom centrés, rien à droite
 * - Desktop: Logo avec nom à gauche, Navigation centrée, Actions à droite
 *
 * Container: max-w-6xl (cohérent avec navbar.tsx)
 * Hauteur: h-16 sm:h-20 (cohérent avec navbar.tsx)
 * Colonnes: flex `flex-1 / auto / flex-1`, la gauche passant `lg:flex-none`
 * (cohérent avec navbar.tsx — cf. son commentaire pour les deux régimes)
 */
export function NavbarSkeleton() {
	return (
		<header
			// Même SOL que la navbar réelle (« La devanture », 2026-08-04) : fond,
			// filet et grain sont désormais permanents et non plus révélés au scroll.
			// Un squelette `bg-transparent border-transparent` aurait fait apparaître
			// la barre d'un coup au swap Suspense, à chaque cold load.
			// Pas de bandeau d'accent en revanche : la route n'est pas encore résolue
			// côté client, et deviner une couleur pour la corriger 200 ms plus tard
			// serait pire que le filet neutre.
			className="pwa-header polaroid-paper bg-background/95 border-border fixed inset-x-0 top-0 z-(--z-header) border-b backdrop-blur-md"
			aria-busy="true"
		>
			{/* Même nom accessible que la navbar réelle : le landmark ne doit pas
			    changer d'identité au swap Suspense. `aria-busy` porte l'état de
			    chargement, le libellé porte l'identité — les mélanger faisait
			    disparaître « Navigation principale » de l'arbre pendant le stream. */}
			<nav
				aria-label="Navigation principale"
				className="ease-in-out motion-safe:transition-all motion-safe:duration-[var(--duration-slow)]"
			>
				<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
					{/* Mêmes colonnes que la navbar réelle : la géométrie est déclarée deux
					    fois, elle doit bouger deux fois. Depuis 2026-08-04, plus de grille —
					    la nav suit le logo à gauche, seule la colonne droite grandit. */}
					<div className="flex h-16 items-center gap-4 sm:h-20">
						{/* Section gauche: Menu burger (mobile) / Logo (desktop) */}
						<div className="flex min-w-0 flex-1 items-center lg:flex-none">
							{/* Menu burger skeleton (mobile uniquement) - size-11 = 44px matches real burger.
							    `-ml-3` reproduit l'offset du vrai trigger (`menu-sheet.tsx`) : sans lui, le
							    burger sautait de 0.75rem vers la gauche au swap squelette → navbar. */}
							<div className="bg-muted/60 -ml-3 size-11 rounded-md motion-safe:animate-pulse lg:hidden" />

							{/* Pas de placeholder recherche mobile : le trigger a été retiré de la
							    navbar (l'entrée mobile est l'onglet « Rechercher » de la bottom-nav,
							    audit recherche 2026-07-26) — un placeholder ici décalait le logo au
							    swap skeleton → navbar. */}

							{/* Logo skeleton (desktop uniquement) */}
							<div className="hidden items-center gap-3 lg:flex">
								{/* Icône logo - size-12 = 48px, rounded-full comme le Logo réel (rounded="full" par défaut) */}
								<div className="bg-muted/60 size-12 rounded-full motion-safe:animate-pulse" />
								{/* Texte "SYNCLUNE" */}
								<div className="bg-muted/60 h-6 w-24 rounded-md motion-safe:animate-pulse" />
							</div>
						</div>

						{/* Section centrale: Logo (mobile) / Navigation desktop */}
						<div className="flex min-w-0 items-center justify-center">
							{/* Logo mobile — icône 40px + nom, comme la navbar réelle depuis la
							    déduplication du cluster d'actions. */}
							<div className="flex items-center gap-3 lg:hidden">
								<div className="bg-muted/60 size-10 rounded-full motion-safe:animate-pulse" />
								<div className="bg-muted/60 h-5 w-24 rounded-md motion-safe:animate-pulse" />
							</div>

							{/* Navigation desktop skeleton (cachée sur mobile) */}
							{/* 2 items: Les créations, Les collections (synchronisé avec getDesktopNavItems) */}
							<div className="hidden items-center gap-1 lg:flex">
								<div className="bg-muted/60 h-9 w-28 rounded-md motion-safe:animate-pulse" />
								<div className="bg-muted/60 h-9 w-32 rounded-md motion-safe:animate-pulse" />
							</div>
						</div>

						{/* Section droite — VIDE sous `lg` : le cluster d'actions (favoris,
						    recherche, panier) est désormais `hidden lg:inline-flex`, la
						    bottom-bar en étant le porteur unique sur mobile. Pas de
						    placeholder « compte » non plus : UserMenu rend null hors session
						    admin, soit 100 % du trafic public. */}
						<div className="flex min-w-0 flex-1 items-center justify-end">
							<div className="hidden items-center gap-2 sm:gap-3 lg:flex">
								{/* Favoris, recherche et panier : trois carrés de 44px */}
								<div className="bg-muted/60 size-11 rounded-md motion-safe:animate-pulse" />
								<div className="bg-muted/60 size-11 rounded-md motion-safe:animate-pulse" />
								<div className="bg-muted/60 size-11 rounded-md motion-safe:animate-pulse" />
							</div>
						</div>
					</div>
				</div>
			</nav>
		</header>
	);
}
