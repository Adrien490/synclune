"use client";

import { Button } from "@/shared/components/ui/button";
import {
	Carousel,
	CarouselApi,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
} from "@/shared/components/ui/carousel";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { cn } from "@/shared/utils/cn";
import Autoplay from "embla-carousel-autoplay";
import { useReducedMotion } from "motion/react";
import { Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PRODUCT_CAROUSEL_CONFIG } from "../constants/carousel.constants";

interface ProductCarouselItem {
	id: string;
	slug: string;
	title: string;
	price: number;
	image: { url: string; alt: string; blurDataUrl?: string };
}

interface ProductCarouselUIProps {
	products: ProductCarouselItem[];
}

/**
 * Hero Carousel - Pattern officiel shadcn/ui
 * Auto-play 5s avec pause au hover (plugin Embla)
 * Accessible: WCAG 2.5.5 (touch targets), 2.3.2 (reduced motion), 2.5.1 (pointer gestures)
 */
export function ProductCarouselUI({ products }: ProductCarouselUIProps) {
	const [api, setApi] = useState<CarouselApi>();
	const [current, setCurrent] = useState(0);
	const prefersReducedMotion = useReducedMotion();

	// Plugin Autoplay - désactivé si l'utilisateur préfère les mouvements réduits (a11y WCAG 2.3.2)
	const autoplayPlugin = useRef(
		Autoplay({
			delay: PRODUCT_CAROUSEL_CONFIG.AUTOPLAY_DELAY,
			stopOnInteraction: false,
			stopOnMouseEnter: true,
			stopOnFocusIn: true,
		}),
	);

	const plugins = prefersReducedMotion ? [] : [autoplayPlugin.current];

	// Tracking du slide actif
	useEffect(() => {
		if (!api) return;

		const onSelect = () => {
			setCurrent(api.selectedScrollSnap());
		};

		api.on("select", onSelect);
		onSelect();

		return () => {
			api.off("select", onSelect);
		};
	}, [api]);

	// Navigation avec scrollTo
	const scrollTo = (index: number) => {
		api?.scrollTo(index);
	};

	if (products.length === 0) {
		return (
			<div className="bg-muted relative flex h-full min-h-80 flex-col items-center justify-center gap-3 rounded-2xl sm:min-h-100 lg:min-h-120">
				{/* R7: Icône SVG au lieu d'emoji */}
				<div className="bg-muted-foreground/10 flex size-12 items-center justify-center rounded-full">
					<Sparkles className="text-muted-foreground size-6" aria-hidden="true" />
				</div>
				<p className="text-muted-foreground px-4 text-center">
					Aucun produit disponible pour le moment
				</p>
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-7xl">
			{/* R9: tabIndex pour focus clavier explicite */}
			<div
				role="region"
				aria-label="Carrousel de produits vedettes"
				aria-roledescription="carrousel"
				// eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- carousel needs keyboard navigation
				tabIndex={0}
				className="focus-visible:ring-ring rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
			>
				{/* Annonce pour lecteurs d'écran */}
				<div className="sr-only" aria-live="polite" aria-atomic="true">
					Produit {current + 1} sur {products.length}
					{products[current] ? `: ${products[current].title}` : ""}
				</div>

				{/* R8: group/carousel pour éviter conflit avec group du Link */}
				<Carousel
					setApi={setApi}
					plugins={plugins}
					opts={{
						align: "start",
						loop: true,
					}}
					className="group/carousel h-full w-full"
				>
					<CarouselContent className="h-full">
						{products.map((product, index) => (
							<CarouselItem key={product.id} className="h-full">
								<Link
									href={`/creations/${product.slug}`}
									className="group relative block h-full min-h-80 overflow-hidden rounded-2xl shadow-2xl sm:min-h-100 lg:min-h-120"
								>
									<Image
										src={product.image.url}
										alt={product.image.alt}
										fill
										className="object-cover object-center transition-transform duration-700 group-hover:scale-105"
										placeholder={product.image.blurDataUrl ? "blur" : "empty"}
										blurDataURL={product.image.blurDataUrl}
										preload={index === 0}
										quality={index === 0 ? 90 : 80}
										sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 50vw"
									/>

									{/* Overlay gradient */}
									<div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />

									{/* R3: spacing bottom augmenté (pb-20 mobile) pour éviter chevauchement avec contrôles */}
									<div className="absolute right-0 bottom-0 left-0 z-10 p-4 pb-20 text-white sm:p-6 sm:pb-8">
										<h2 className="mb-1 line-clamp-2 text-xl font-semibold tracking-tight drop-shadow-lg sm:mb-2 sm:text-2xl">
											{product.title}
										</h2>
										<p className="text-base font-medium drop-shadow-md sm:text-lg">
											{(product.price / 100).toFixed(2)} €
										</p>
									</div>

									{/* Overlay decoratif */}
									<div className="from-primary/10 to-secondary/10 pointer-events-none absolute inset-0 bg-linear-to-tr via-transparent" />
								</Link>
							</CarouselItem>
						))}
					</CarouselContent>

					{/* Navigation - utilise les variables thème */}
					<CarouselPrevious
						variant="ghost"
						aria-label="Produit précédent"
						className={cn(
							"flex",
							// Position responsive
							"bottom-4 left-4",
							"sm:top-1/2 sm:bottom-auto sm:-translate-y-1/2",
							// Touch targets (WCAG 2.5.5)
							"size-11 sm:size-12 md:size-11",
							// Thème: primary avec opacité
							"bg-primary/80 rounded-full border-0",
							"can-hover:hover:shadow-xl shadow-lg",
							"text-primary-foreground",
							"can-hover:hover:bg-primary can-hover:hover:scale-105",
							// Desktop: apparaît au survol
							"sm:opacity-0 sm:group-hover/carousel:opacity-100 sm:focus-visible:opacity-100",
							"disabled:pointer-events-none disabled:opacity-40 disabled:hover:scale-100",
							"transition-all duration-300",
						)}
					/>
					<CarouselNext
						variant="ghost"
						aria-label="Produit suivant"
						className={cn(
							"flex",
							// Position responsive
							"right-4 bottom-4",
							"sm:top-1/2 sm:bottom-auto sm:-translate-y-1/2",
							// Touch targets (WCAG 2.5.5)
							"size-11 sm:size-12 md:size-11",
							// Thème: primary avec opacité
							"bg-primary/80 rounded-full border-0",
							"can-hover:hover:shadow-xl shadow-lg",
							"text-primary-foreground",
							"can-hover:hover:bg-primary can-hover:hover:scale-105",
							// Desktop: apparaît au survol
							"sm:opacity-0 sm:group-hover/carousel:opacity-100 sm:focus-visible:opacity-100",
							"disabled:pointer-events-none disabled:opacity-40 disabled:hover:scale-100",
							"transition-all duration-300",
						)}
					/>

					{/* Dots - utilise les variables thème */}
					<div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1">
						{products.map((product, index) => (
							<Tooltip key={index}>
								<TooltipTrigger asChild>
									<Button
										onClick={() => scrollTo(index)}
										variant="ghost"
										size="icon"
										className={cn(
											// Zone tactile (WCAG 2.5.5)
											"size-11 cursor-pointer p-0",
											"flex items-center justify-center",
											"transition-[background-color] duration-300",
											// Thème: hover avec card
											"hover:bg-card/10 rounded-full",
										)}
										aria-label={`Aller au produit ${index + 1}: ${product.title}`}
										aria-current={current === index ? "true" : undefined}
									>
										<span
											className={cn(
												"flex size-3 items-center justify-center rounded-full sm:size-3.5",
												// Compositor-only: scale instead of size change
												"motion-safe:transition-[transform,background-color,box-shadow] motion-safe:duration-300",
												current === index
													? // Actif: thème card/foreground
														"bg-card text-foreground scale-[2] font-semibold shadow-lg"
													: // Inactif: thème card avec opacité
														"bg-card/70 group-hover/carousel:bg-card/90 scale-100",
											)}
										>
											{current === index && (
												<span className="text-[5px] sm:text-[6px]">{index + 1}</span>
											)}
										</span>
									</Button>
								</TooltipTrigger>
								<TooltipContent side="top" className="hidden max-w-50 sm:block">
									<p className="truncate text-sm font-medium">{product.title}</p>
									<p className="text-muted-foreground text-xs">
										{(product.price / 100).toFixed(2)} €
									</p>
								</TooltipContent>
							</Tooltip>
						))}
					</div>
				</Carousel>
			</div>
		</div>
	);
}
