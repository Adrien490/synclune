import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Skeleton matching the product detail main region (gallery + product info + product details).
 * Used as Suspense fallback in `page.tsx` AND inside `loading.tsx` to guarantee a single
 * source of truth and zero CLS between initial render, streaming, and hydration.
 *
 * Layout mirrors `app/(shop)/creations/[slug]/page.tsx` and `ProductDetails`.
 * ⚠️ Toute modification de rythme ou de structure de la colonne droite doit être
 * répercutée ICI, sinon décalage de mise en page au streaming.
 */
export function ProductMainSkeleton() {
	return (
		<div
			className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-16"
			role="status"
			aria-busy="true"
			aria-label="Chargement de la création"
		>
			<span className="sr-only">Chargement de la création…</span>

			{/* Gallery Section - Left (sticky on desktop).
			    L'offset réserve la barre d'achat collante comme la page — cf.
			    `--pdp-cta-bar-height`, publiée par `StickyCartCTADesktop`. */}
			<section className="lg:sticky lg:top-[calc(var(--navbar-height)+var(--pdp-cta-bar-height,0px))] lg:z-10 lg:h-fit lg:max-h-[calc(100dvh-6rem-var(--pdp-cta-bar-height,0px))] lg:overflow-hidden">
				<div className="grid grid-cols-1 gap-3 md:grid-cols-[60px_1fr] md:gap-4 lg:grid-cols-[80px_1fr]">
					{/* Thumbnails verticales - Desktop uniquement.
					    `pb-2.5` par vignette : c'est la gouttière du trait dessiné qui
					    marque la vue active (cf. `GalleryThumbnailList`). */}
					<div className="order-1 hidden overflow-y-auto md:block">
						<div className="flex flex-col gap-2">
							{Array.from({ length: 4 }).map((_, i) => (
								<div key={i} className="pb-2.5">
									<Skeleton className="bg-muted/40 aspect-square w-full rounded-xl" />
								</div>
							))}
						</div>
					</div>

					{/* Le carton — même géométrie que `gallery.tsx` : mêmes paddings, même
					    rayon, même réserve basse. C'est ce qui évite le saut de mise en page
					    au streaming. L'ancien squelette dessinait le compteur en `top-3
					    right-3` alors qu'il vivait en `top-3 left-3 … hidden sm:block` : le
					    miroir avait dérivé, et rien ne le verrouillait. */}
					<div className="bg-card relative order-2 rounded-sm p-3 pb-4 shadow-sm sm:p-3.5 sm:pb-5">
						<div className="bg-muted/30 relative aspect-3/4 overflow-hidden rounded-[2px] sm:aspect-4/5">
							<Skeleton className="from-muted/60 via-muted/40 absolute inset-0 to-transparent" />
							<div className="absolute inset-0 flex items-center justify-center">
								<div className="border-muted/60 border-t-primary/40 size-16 rounded-full border-4 motion-safe:animate-spin" />
							</div>
						</div>
						{/* Réserve basse : numéro de vue à gauche, loupe à droite (desktop).
						    `md:min-h-11` — pas `min-h-11` : sous ce seuil la réserve réelle ne
						    contient aucune cible tactile (la loupe est `hidden md:flex`), donc
						    `gallery.tsx` n'y impose plus 44 px. Miroir à garder aligné. */}
						<div className="mt-3 flex items-center gap-3 md:min-h-11">
							<Skeleton className="bg-muted/60 h-4 w-10 rounded-sm" />
							<Skeleton className="bg-muted/40 ms-auto hidden size-11 rounded-full md:block" />
						</div>
					</div>

					{/* Thumbnails horizontales - Mobile uniquement */}
					<div className="order-3 mt-3 md:hidden">
						<div className="flex gap-2">
							{Array.from({ length: 4 }).map((_, i) => (
								<div key={i} className="shrink-0 pb-2.5">
									<Skeleton className="bg-muted/40 size-14 rounded-xl" />
								</div>
							))}
						</div>
					</div>
				</div>
			</section>

			{/* Product Info + Details Section - Right (scrollable) */}
			<section className="space-y-6 lg:min-h-dvh">
				{/* ===== 1. ProductInfo : eyebrow + titre + provenance, actions à droite ===== */}
				<div className="flex items-start justify-between gap-4">
					<div className="min-w-0 flex-1 space-y-1">
						<Skeleton className="bg-muted/30 h-4 w-20" />
						<Skeleton className="bg-muted/50 h-9 w-full" />
						<Skeleton className="bg-muted/50 h-9 w-2/3" />
						<Skeleton className="bg-muted/30 h-4 w-44" />
					</div>
					<div className="flex shrink-0 items-center gap-1">
						<Skeleton className="bg-muted/30 size-11 rounded-full" />
						<Skeleton className="bg-muted/30 size-11 rounded-full" />
					</div>
				</div>

				{/* ===== 2. ProductDetails ===== */}
				<div className="flex flex-col gap-6">
					{/* Le bloc de décision, serré à 12 px comme `ProductDetails` */}
					<div className="flex flex-col gap-3">
						{/* 2a. L'aplat de la pièce : prix + disponibilité + livraison */}
						<div className="bg-primary/25 space-y-2 rounded-lg p-5">
							<div className="flex items-baseline gap-3">
								<Skeleton className="bg-foreground/10 h-10 w-32" />
								<Skeleton className="bg-foreground/10 ms-auto h-5 w-20" />
							</div>
							<Skeleton className="bg-foreground/10 h-4 w-56" />
						</div>

						{/* 2b. VariantSelector — Card + nuancier (plaquettes 88 × 56 + libellé) */}
						<div className="border-primary/20 rounded-xl border-2 shadow-sm">
							<div className="space-y-2 p-6 pb-0">
								<Skeleton className="bg-muted/40 h-5 w-44" />
								<Skeleton className="bg-muted/30 h-4 w-64" />
							</div>
							<div className="space-y-6 p-6">
								<div className="space-y-3">
									<Skeleton className="bg-muted/30 h-4 w-20" />
									<div className="flex flex-wrap gap-2.5">
										{Array.from({ length: 3 }).map((_, i) => (
											<Skeleton key={i} className="bg-muted/40 h-21 w-22 rounded-md" />
										))}
									</div>
								</div>

								<div className="bg-border h-px" />

								<div className="space-y-3">
									<Skeleton className="bg-muted/30 h-4 w-24" />
									<div className="grid grid-cols-2 gap-2">
										{Array.from({ length: 2 }).map((_, i) => (
											<Skeleton key={i} className="bg-muted/40 h-11 rounded-lg" />
										))}
									</div>
								</div>
							</div>
						</div>

						{/* 2c. AddToCartForm */}
						<Skeleton className="bg-primary/30 h-12 w-full rounded-lg" />
					</div>

					{/* 3. Description — prose Fraunces, mesure bornée */}
					<div className="max-w-[34rem] space-y-3">
						<Skeleton className="bg-muted/30 h-6 w-full" />
						<Skeleton className="bg-muted/30 h-6 w-full" />
						<Skeleton className="bg-muted/30 h-6 w-3/4" />
					</div>

					{/* 4. La fiche : une enveloppe, trois filets */}
					<div className="border-border divide-border divide-y rounded-xl border">
						{Array.from({ length: 3 }).map((_, i) => (
							<div key={i} className="space-y-2.5 p-4">
								<Skeleton className="bg-muted/40 h-4 w-24" />
								<Skeleton className="bg-muted/30 h-4 w-full" />
								<Skeleton className="bg-muted/30 h-4 w-2/3" />
							</div>
						))}
					</div>

					{/* 5. Le mot de la fin, détaché de 48 px */}
					<div className="pt-6">
						<div className="bg-muted/40 space-y-2 rounded-xl p-5">
							<Skeleton className="bg-muted/50 h-4 w-48" />
							<Skeleton className="bg-muted/30 h-4 w-full" />
							<Skeleton className="bg-muted/30 h-4 w-5/6" />
						</div>
					</div>
				</div>
			</section>
		</div>
	);
}
