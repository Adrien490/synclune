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
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/shared/components/ui/tooltip";
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
		})
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
			<div className="relative h-full min-h-[320px] sm:min-h-[400px] lg:min-h-[480px] rounded-2xl bg-muted flex flex-col items-center justify-center gap-3">
				{/* R7: Icône SVG au lieu d'emoji */}
				<div className="size-12 rounded-full bg-muted-foreground/10 flex items-center justify-center">
					<Sparkles
						className="size-6 text-muted-foreground"
						aria-hidden="true"
					/>
				</div>
				<p className="text-muted-foreground text-center px-4">
					Aucun produit disponible pour le moment
				</p>
			</div>
		);
	}

	return (
		<div className="max-w-7xl mx-auto">
			{/* R9: tabIndex pour focus clavier explicite */}
			<div
				role="region"
				aria-label="Carrousel de produits vedettes"
				aria-roledescription="carrousel"
				tabIndex={0}
				className="outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-2xl"
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
					className="w-full h-full group/carousel"
				>
					<CarouselContent className="h-full">
						{products.map((product, index) => (
							<CarouselItem key={product.id} className="h-full">
								<Link
									href={`/creations/${product.slug}`}
									className="block relative h-full min-h-[320px] sm:min-h-[400px] lg:min-h-[480px] rounded-2xl overflow-hidden shadow-2xl group"
								>
									<Image
										src={product.image.url}
										alt={product.image.alt}
										fill
										className="object-cover object-center transition-transform duration-700 group-hover:scale-105"
										placeholder={product.image.blurDataUrl ? "blur" : "empty"}
										blurDataURL={product.image.blurDataUrl}
										priority={index === 0}
										quality={index === 0 ? 90 : 80}
										sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 50vw"
									/>

									{/* Overlay gradient */}
									<div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />

									{/* R3: spacing bottom augmenté (pb-20 mobile) pour éviter chevauchement avec contrôles */}
									<div className="absolute bottom-0 left-0 right-0 p-4 pb-20 sm:p-6 sm:pb-8 text-white z-10">
										<h2 className="text-xl sm:text-2xl font-semibold mb-1 sm:mb-2 tracking-tight drop-shadow-lg line-clamp-2">
											{product.title}
										</h2>
										<p className="text-base sm:text-lg font-medium drop-shadow-md">
											{(product.price / 100).toFixed(2)} €
										</p>
									</div>

									{/* Overlay decoratif */}
									<div className="absolute inset-0 bg-linear-to-tr from-primary/10 via-transparent to-secondary/10 pointer-events-none" />
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
							"sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2",
							// Touch targets (WCAG 2.5.5)
							"size-10 sm:size-12 md:size-10",
							// Thème: primary avec opacité
							"rounded-full bg-primary/80 border-0",
							"shadow-lg hover:shadow-xl",
							"text-primary-foreground",
							"hover:bg-primary hover:scale-105",
							// Desktop: apparaît au survol
							"sm:opacity-0 sm:group-hover/carousel:opacity-100 sm:focus-visible:opacity-100",
							"disabled:opacity-40 disabled:pointer-events-none disabled:hover:scale-100",
							"transition-all duration-300"
						)}
					/>
					<CarouselNext
						variant="ghost"
						aria-label="Produit suivant"
						className={cn(
							"flex",
							// Position responsive
							"bottom-4 right-4",
							"sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2",
							// Touch targets (WCAG 2.5.5)
							"size-10 sm:size-12 md:size-10",
							// Thème: primary avec opacité
							"rounded-full bg-primary/80 border-0",
							"shadow-lg hover:shadow-xl",
							"text-primary-foreground",
							"hover:bg-primary hover:scale-105",
							// Desktop: apparaît au survol
							"sm:opacity-0 sm:group-hover/carousel:opacity-100 sm:focus-visible:opacity-100",
							"disabled:opacity-40 disabled:pointer-events-none disabled:hover:scale-100",
							"transition-all duration-300"
						)}
					/>

					{/* Dots - utilise les variables thème */}
					<div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 z-20">
						{products.map((product, index) => (
							<Tooltip key={index}>
								<TooltipTrigger asChild>
									<Button
										onClick={() => scrollTo(index)}
										variant="ghost"
										size="icon"
										className={cn(
											// Zone tactile (WCAG 2.5.5)
											"size-10 sm:size-11 p-0 cursor-pointer",
											"flex items-center justify-center",
											"transition-all duration-300",
											// Thème: hover avec card
											"hover:bg-card/10 rounded-full"
										)}
										aria-label={`Aller au produit ${index + 1}: ${product.title}`}
										aria-current={current === index ? "true" : undefined}
									>
										<span
											className={cn(
												"flex items-center justify-center rounded-full transition-all duration-300",
												current === index
													? // Actif: thème card/foreground
														"size-6 sm:size-7 bg-card text-foreground text-xs font-semibold shadow-lg"
													: // Inactif: thème card avec opacité
														"size-3 sm:size-3.5 bg-card/70 group-hover/carousel:bg-card/90"
											)}
										>
											{current === index && (
												<span className="text-[10px] sm:text-xs">
													{index + 1}
												</span>
											)}
										</span>
									</Button>
								</TooltipTrigger>
								<TooltipContent
									side="top"
									className="hidden sm:block max-w-[200px]"
								>
									<p className="text-sm font-medium truncate">{product.title}</p>
									<p className="text-xs text-muted-foreground">
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
