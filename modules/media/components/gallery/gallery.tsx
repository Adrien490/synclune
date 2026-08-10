"use client";

import useEmblaCarousel from "embla-carousel-react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useEffectEvent, useRef, useState } from "react";

import { HAND_DRAWN_STROKES } from "@/shared/components/hand-drawn/constants";
import { Skeleton, SkeletonGroup } from "@/shared/components/ui/skeleton";
import { useReducedMotion } from "motion/react";
import { cn } from "@/shared/utils/cn";

import {
	PREFETCH_RANGE_FAST,
	PREFETCH_RANGE_SLOW,
} from "@/modules/media/constants/gallery.constants";
import { usePrefetchImages } from "@/modules/media/hooks/use-image-prefetch";
import { usePrefetchVideos } from "@/modules/media/hooks/use-video-prefetch";
import { parseGalleryParams } from "@/modules/media/schemas/gallery-params.schema";
import { productViewTransitionName } from "@/modules/products/utils/product-view-transition";
import { buildGallery } from "@/modules/media/services/gallery-builder.service";
import { buildLightboxSlides } from "@/modules/media/services/lightbox-builder.service";

import {
	GalleryCounter,
	GalleryNavigation,
	GalleryTapHint,
	GalleryZoomButton,
} from "@/shared/components/gallery";
import { HandDrawnAccent } from "@/shared/components/animations/hand-drawn-accent";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { Spinner } from "@/shared/components/ui/spinner";
import { useLightbox } from "@/shared/hooks";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { mediaBelow } from "@/shared/constants/breakpoints";
import { GallerySlide } from "./slide";
import { GalleryThumbnail } from "./thumbnail";

// Code-split — lightbox charge uniquement à l'ouverture, jamais en SSR.
const MediaLightbox = dynamic(() => import("@/modules/media/components/media-lightbox"), {
	ssr: false,
	loading: () => null,
});

import type { ProductMedia } from "@/modules/media/types/product-media.types";
import type { GetProductReturn } from "@/modules/products/types/product.types";

// Connection-aware prefetch range with intelligent fallback
// Safari/Firefox don't support navigator.connection
// Fallback: mobile viewport without connection API = treat as moderate connection
function getEffectivePrefetchRange(): number {
	const connection =
		typeof navigator !== "undefined"
			? (navigator as Navigator & { connection?: { effectiveType?: string } }).connection
					?.effectiveType
			: undefined;

	// Use connection API if available
	if (connection) {
		return connection === "slow-2g" || connection === "2g"
			? PREFETCH_RANGE_SLOW
			: PREFETCH_RANGE_FAST;
	}

	// Fallback: mobile without connection API = conservative (Safari iOS ~25% FR traffic).
	// `matchMedia` plutôt que `innerWidth` (qui inclut la scrollbar, ~15px de
	// divergence avec le CSS) et seuil issu du SSOT en rem.
	if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
		if (window.matchMedia(mediaBelow("md")).matches) {
			return PREFETCH_RANGE_SLOW;
		}
	}

	return PREFETCH_RANGE_FAST;
}

interface GalleryProps {
	product: GetProductReturn;
	title: string;
}

function GalleryLoadingSkeleton() {
	return (
		<SkeletonGroup label="Chargement de la galerie">
			<div className="w-full">
				<Skeleton className="aspect-3/4 w-full rounded-3xl sm:aspect-4/5" variant="shimmer" />
			</div>
		</SkeletonGroup>
	);
}

// Reusable component to avoid desktop/mobile duplication
interface GalleryThumbnailListProps {
	images: ProductMedia[];
	current: number;
	thumbnailErrors: Set<string>;
	title: string;
	onScrollTo: (index: number) => void;
	onError: (mediaId: string) => void;
	variant: "desktop" | "mobile";
}

function GalleryThumbnailList({
	images,
	current,
	thumbnailErrors,
	title,
	onScrollTo,
	onError,
	variant,
}: GalleryThumbnailListProps) {
	const isDesktop = variant === "desktop";
	const prefersReduced = useReducedMotion();
	const tablistRef = useRef<HTMLDivElement>(null);

	// Scroll active thumbnail into view when current changes
	useEffect(() => {
		const tablist = tablistRef.current;
		if (!tablist) return;

		const activeButton = tablist.querySelectorAll<HTMLButtonElement>('[role="tab"]')[current];
		activeButton?.scrollIntoView({
			block: "nearest",
			inline: "nearest",
			behavior: prefersReduced ? "instant" : "smooth",
		});
	}, [current, prefersReduced]);

	// Le trait dessiné sous la vignette active EST l'indicateur de position.
	// Il remplace l'ancien pager tactile, qui basculait au-delà de 5 photos sur un
	// badge fraction non interactif (`aria-hidden`, aucun handler) : à 5-8 photos
	// par bijou, c'était le cas NOMINAL — le seul contrôle qui ressemblait à un
	// pager était mort, 12 px au-dessus de la bande qui, elle, fonctionnait.
	const thumbnails = images.map((media, index) => (
		<div key={media.id} className={cn("relative pb-2.5", !isDesktop && "shrink-0")}>
			<GalleryThumbnail
				media={media}
				index={index}
				isActive={index === current}
				hasError={thumbnailErrors.has(media.id)}
				title={title}
				onClick={() => onScrollTo(index)}
				onError={() => onError(media.id)}
				className={isDesktop ? "can-hover:hover:shadow-sm" : "size-14"}
				isLCPCandidate={index === 0}
			/>
			{index === current && (
				// Monté/démonté au changement de vue : l'animation `hand-draw-load`
				// rejoue donc à chaque fois, et le trait SE DESSINE au lieu
				// d'apparaître. Neutralisée sous `prefers-reduced-motion`.
				// Width seule (hauteur dérivée — l'ancien couple ×9 letterboxait) ;
				// graisse au cran `marqueur` de l'échelle (l'ancien 3 était hors échelle).
				// `--piece-accent` : l'exception documentée à la cascade de section.
				<HandDrawnAccent
					variant="underline"
					inView={false}
					color="var(--piece-accent, var(--primary))"
					strokeWidth={HAND_DRAWN_STROKES.marqueur}
					width={isDesktop ? 52 : 40}
					duration={MOTION_CONFIG.duration.slow}
					className="absolute inset-x-0 bottom-0 mx-auto"
				/>
			)}
		</div>
	));

	if (isDesktop) {
		return (
			// Plafonné à la hauteur de la photo, et défilant. Sans ça, à 8 vignettes
			// de 80 px, le rail mesurait 696 px contre 570 px de photo : la ligne de
			// grille prenait la hauteur du RAIL et laissait ~126 px de vide sous le
			// bijou — et `scrollIntoView` n'avait aucun conteneur à faire défiler.
			<div className="relative order-1 hidden md:block">
				<div
					ref={tablistRef}
					className="absolute inset-0 flex flex-col gap-2 overflow-y-auto pr-1"
					role="tablist"
					aria-label="Vignettes du produit"
				>
					{thumbnails}
				</div>
			</div>
		);
	}

	// Mobile: horizontal scroll avec `scroll-fade-x` (le fondu de bord indique l'overflow)
	return (
		<div className="order-3 mt-3 md:hidden">
			<div
				data-slot="scroll-fade-container"
				data-no-edge-swipe=""
				className="scroll-fade-x no-scrollbar w-full overflow-x-auto overflow-y-hidden"
			>
				<div
					ref={tablistRef}
					className="flex w-fit min-w-full flex-nowrap gap-2 py-1 pr-[env(safe-area-inset-right,0px)] pl-[env(safe-area-inset-left,0px)]"
					role="tablist"
					aria-label="Vignettes du produit"
				>
					{thumbnails}
				</div>
			</div>
		</div>
	);
}

export function Gallery(props: GalleryProps) {
	return (
		<Suspense fallback={<GalleryLoadingSkeleton />}>
			<GalleryContent {...props} />
		</Suspense>
	);
}

function GalleryContent({ product, title }: GalleryProps) {
	const searchParams = useSearchParams();
	const [current, setCurrent] = useState(0);
	const [thumbnailErrors, setThumbnailErrors] = useState<Set<string>>(new Set());
	const { isOpen, open, close } = useLightbox();
	// L'indice « Appuie pour agrandir » ne sert qu'avant la première ouverture.
	// Suivi ici plutôt que dans `GalleryTapHint` : c'est la galerie qui possède les
	// deux chemins d'ouverture (tap sur le slide et loupe desktop).
	const [hasOpenedLightbox, setHasOpenedLightbox] = useState(false);
	const openLightbox = () => {
		setHasOpenedLightbox(true);
		open();
	};
	const prefersReduced = useReducedMotion();
	const haptic = useHaptic();
	const galleryRef = useRef<HTMLDivElement>(null);

	const handleThumbnailError = (mediaId: string) => {
		setThumbnailErrors((prev) => new Set(prev).add(mediaId));
	};

	// Product type for descriptive ALT texts
	const productType = product.type?.label;

	// Extract and validate URL params for variants
	const {
		color: colorSlug,
		material: materialSlug,
		size,
		variant: colorCombo,
	} = parseGalleryParams({
		color: searchParams.get("color") ?? undefined,
		material: searchParams.get("material") ?? undefined,
		size: searchParams.get("size") ?? undefined,
		variant: searchParams.get("variant") ?? undefined,
	});

	// Build image list based on selected variants
	const selectedVariants = { colorCombo, colorSlug, materialSlug, size };
	const images: ProductMedia[] = buildGallery({ product, selectedVariants });

	// Teinte du carton : la couleur du bijou qu'on regarde. Elle n'est plus
	// calculée ici — `ProductAccentScope` la pose une seule fois en
	// `--piece-accent` sur l'`<article>` de la fiche, pour que l'aplat du prix,
	// le nuancier et le CTA la partagent au lieu de la voir s'arrêter au carton.
	// La galerie n'en est plus qu'un consommateur ; hors de ce scope, le repli
	// `--primary` s'applique.
	const slides = buildLightboxSlides(images, prefersReduced);

	// Embla carousel
	const [emblaRef, emblaApi] = useEmblaCarousel({
		loop: true,
		align: "center",
		dragFree: false,
		watchDrag: images.length > 1,
	});

	// Track pointer drag to differentiate swipe-triggered selects from button-triggered ones
	const isDraggingRef = useRef(false);

	const prefetchRange = getEffectivePrefetchRange();

	// Smart prefetch of adjacent images (Next.js 16 + React 19)
	// Extract URLs to avoid recreating an array on each render
	const imageUrls = images.map((img) => img.url);

	usePrefetchImages({
		imageUrls,
		currentIndex: current,
		prefetchRange,
		enabled: images.length > 1,
	});

	// Prefetch adjacent video metadata
	usePrefetchVideos({
		medias: images,
		currentIndex: current,
		prefetchRange,
		enabled: images.length > 1,
	});

	// Effect Event to handle onSelect without re-registration
	const onSelect = useEffectEvent(() => {
		if (!emblaApi) return;
		const next = emblaApi.selectedScrollSnap();
		setCurrent(next);
		// Haptic only on swipe-triggered selects (buttons already emit "selection" on click)
		if (isDraggingRef.current) {
			haptic("light");
			isDraggingRef.current = false;
		}
	});

	const onPointerDown = useEffectEvent(() => {
		isDraggingRef.current = true;
	});

	// Sync index when carousel changes
	useEffect(() => {
		if (!emblaApi) return;

		emblaApi.on("select", onSelect);
		emblaApi.on("reInit", onSelect);
		emblaApi.on("pointerDown", onPointerDown);

		return () => {
			emblaApi.off("select", onSelect);
			emblaApi.off("reInit", onSelect);
			emblaApi.off("pointerDown", onPointerDown);
		};
	}, [emblaApi]);

	// Effect Event to handle keyboard navigation without re-registration
	const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
		// Don't capture if focus is in an input/textarea
		if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
			return;
		}

		if (!emblaApi) return;

		switch (e.key) {
			case "ArrowLeft":
				e.preventDefault();
				emblaApi.scrollPrev();
				break;
			case "ArrowRight":
				e.preventDefault();
				emblaApi.scrollNext();
				break;
			case "Home":
				e.preventDefault();
				emblaApi.scrollTo(0);
				break;
			case "End":
				e.preventDefault();
				emblaApi.scrollTo(images.length - 1);
				break;
		}
	});

	// Keyboard navigation (WCAG 2.1.1) — scoped to gallery element
	useEffect(() => {
		if (!emblaApi || images.length <= 1) return;
		const el = galleryRef.current;
		if (!el) return;

		el.addEventListener("keydown", onKeyDown);
		return () => el.removeEventListener("keydown", onKeyDown);
	}, [emblaApi, images.length]);

	// Navigation
	const scrollPrev = () => {
		haptic("selection");
		emblaApi?.scrollPrev();
	};
	const scrollNext = () => {
		haptic("selection");
		emblaApi?.scrollNext();
	};
	const scrollTo = (index: number) => emblaApi?.scrollTo(index);

	// Conditional transition classes (composable only: transform, opacity)
	const transitionClass = prefersReduced ? "" : "transition-[transform,opacity] duration-300";

	// Edge case: no images
	if (!images.length) {
		return (
			<div className="gallery-empty">
				<div className="bg-linear-card relative flex aspect-3/4 items-center justify-center overflow-hidden rounded-3xl p-8 sm:aspect-4/5">
					<div
						className={cn(
							"bg-linear-organic absolute inset-0 rounded-3xl opacity-10",
							!prefersReduced && "animate-pulse",
						)}
					/>
					<div className="relative z-10 space-y-3 text-center">
						<span
							className={cn("text-4xl", !prefersReduced && "motion-safe:animate-bounce")}
							aria-hidden="true"
						>
							✨
						</span>
						{/* `text-primary` ici, c'était du TEXTE à 1,6:1 sur la carte (WCAG 1.4.3
						    demande 4,5:1). Le rose pastel est un aplat, jamais une encre. */}
						<p className="text-foreground text-sm font-medium">Photos en préparation</p>
						<p className="text-muted-foreground text-sm leading-normal">Un peu de patience !</p>
					</div>
				</div>
			</div>
		);
	}

	const currentMedia = images[current];

	return (
		<>
			<div
				ref={galleryRef}
				tabIndex={-1}
				className={cn(
					"outline-none",
					"product-gallery w-full",
					transitionClass,
					"group-has-[[data-pending]]/product-details:blur-[1px]",
					"group-has-[[data-pending]]/product-details:scale-[0.99]",
					"group-has-[[data-pending]]/product-details:pointer-events-none",
				)}
				role="region"
				aria-label={`Galerie photos ${title}`}
				aria-roledescription="carrousel"
			>
				{/* Screen reader announcement (WCAG 4.1.3).
				    Le libellé suit le TYPE du média courant, comme le fait déjà
				    `media-lightbox.tsx` : sur un produit `[IMAGE, IMAGE, VIDÉO]`, la 3ᵉ vue
				    s'annonçait « Image 3 sur 3 », et le plein écran ouvert depuis cette même
				    vue disait « Vidéo 3 sur 3 ». Une seule galerie, deux vocabulaires. */}
				<div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
					{currentMedia?.mediaType === "VIDEO" ? "Vidéo" : "Image"} {current + 1} sur{" "}
					{images.length}
				</div>

				<div
					className={cn(
						"grid gap-3 md:gap-4",
						images.length > 1
							? "grid-cols-1 md:grid-cols-[60px_1fr] lg:grid-cols-[80px_1fr]"
							: "grid-cols-1",
					)}
				>
					{/* Vertical thumbnails - Desktop */}
					{images.length > 1 && (
						<GalleryThumbnailList
							images={images}
							current={current}
							thumbnailErrors={thumbnailErrors}
							title={title}
							onScrollTo={scrollTo}
							onError={handleThumbnailError}
							variant="desktop"
						/>
					)}

					{/* Le carton : la photo est MONTÉE dessus, elle ne le remplit pas.
					    Le chrome vit sur ce carton — le numéro de vue et la loupe sont dans la
					    réserve basse, hors de la photo, et les chevrons sont posés À CHEVAL sur
					    le bord (≈30 px des 44 px du jeton retombent sur la photo, à mi-hauteur).
					    Le point commun, celui qui compte : plus rien n'a besoin d'être révélé
					    au survol. */}
					<div className="gallery-main group relative order-2">
						<div className="gallery-mount relative rounded-sm p-3 pb-4 sm:p-3.5 sm:pb-5">
							{/* La boîte photo n'est PAS clippée : c'est le viewport Embla qui
							    clippe, pour que les chevrons puissent déborder du bord du carton. */}
							<div className="relative aspect-3/4 sm:aspect-4/5">
								<div
									ref={emblaRef}
									className="bg-linear-organic absolute inset-0 overflow-hidden rounded-[2px]"
								>
									<div id="gallery-slides" className="flex h-full">
										{images.map((media, index) => (
											<GallerySlide
												// `url` dans la clé : si un média est remplacé en place, React remonte
												// le slide et son `videoState` repart à "loading" — plus besoin d'un
												// effet de reset côté enfant.
												key={`${media.id}-${media.url}`}
												id={`gallery-panel-${index}`}
												media={media}
												index={index}
												title={title}
												productType={productType}
												totalImages={images.length}
												isActive={index === current}
												onOpen={openLightbox}
												viewTransitionName={
													index === 0 ? productViewTransitionName(product.id) : undefined
												}
											/>
										))}
									</div>
								</div>

								{/* Chevrons à cheval sur le bord du carton — permanents, desktop only */}
								{images.length > 1 && (
									<GalleryNavigation
										onPrev={scrollPrev}
										onNext={scrollNext}
										controlsId="gallery-slides"
									/>
								)}
							</div>

							{/* La réserve basse — le poids bas de l'encadreur. `min-h-11` seulement
							    à partir de `md` : c'est la hauteur d'une CIBLE TACTILE, et sous ce
							    seuil la réserve n'en contient aucune (la loupe est `hidden md:flex`,
							    le numéro est un texte `aria-hidden`). On réservait donc 44 px de vide
							    sur le viewport le plus contraint, juste au-dessus de la ligne de
							    flottaison. ⚠️ `product-main-skeleton.tsx` REPRODUIT cette réserve :
							    tout changement de hauteur doit y être répercuté, sinon CLS au
							    streaming. */}
							<div className="mt-3 flex items-center gap-3 md:min-h-11">
								{images.length > 1 && <GalleryCounter current={current} total={images.length} />}
								{/* Sous `md`, aucune commande n'annonçait le plein écran (loupe et
								    chevrons sont `hidden md:flex`, le numéro de vue est `aria-hidden`).
								    L'indice vit ICI, dans la réserve, et pas sur la photo : le chrome
								    reste sur le carton, et la ligne porte déjà un texte de même taille —
								    son apparition/disparition ne change donc pas la hauteur, aucun CLS,
								    rien à répercuter dans `product-main-skeleton.tsx`.
								    ⚠️ Ce n'est PAS une cible tactile (`<p aria-hidden>`) : `md:min-h-11`
								    reste juste, ne pas le repasser en `min-h-11`. */}
								<GalleryTapHint enabled={!hasOpenedLightbox} />
								{/* Inconditionnelle : gatée sur `mediaType === "IMAGE"`, elle se
								    démontait SOUS le focus en arrivant sur un slide vidéo, et la
								    navigation au clavier mourait avec elle. Cf. `zoom-button.tsx`. */}
								<GalleryZoomButton
									onOpen={openLightbox}
									mediaType={currentMedia?.mediaType === "VIDEO" ? "VIDEO" : "IMAGE"}
									isOpen={isOpen}
								/>
							</div>
						</div>
					</div>

					{/* Horizontal thumbnails - Mobile */}
					{images.length > 1 && (
						<GalleryThumbnailList
							images={images}
							current={current}
							thumbnailErrors={thumbnailErrors}
							title={title}
							onScrollTo={scrollTo}
							onError={handleThumbnailError}
							variant="mobile"
						/>
					)}
				</div>
			</div>

			{isOpen && (
				<Suspense
					fallback={
						// Le chunk lightbox se charge à la première ouverture. Sans ce voile, le
						// premier geste — surtout le tap mobile, qui n'a aucun survol pour
						// préchauffer — ne produisait RIEN à l'écran le temps du téléchargement.
						// Même correctif que `media-upload-grid.tsx` côté admin.
						<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
							<Spinner label="Chargement de l'aperçu" className="size-8 text-white" />
						</div>
					}
				>
					<MediaLightbox
						open={isOpen}
						close={close}
						slides={slides}
						index={current}
						onIndexChange={(index) => scrollTo(index)}
					/>
				</Suspense>
			)}
		</>
	);
}
