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
import { cn } from "@/shared/utils/cn";
import Autoplay from "embla-carousel-autoplay";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { PRODUCT_CAROUSEL_CONFIG } from "../constants/carousel.constants";

interface ProductCarouselItem {
	id: string;
	slug: string;
	title: string;
	price: number;
	image: { url: string; alt: string };
}

interface ProductCarouselUIProps {
	products: ProductCarouselItem[];
}

/**
 * Hero Carousel - Pattern officiel shadcn/ui
 * Auto-play 5s avec pause au hover (plugin Embla)
 */
export function ProductCarouselUI({ products }: ProductCarouselUIProps) {
	const [api, setApi] = useState<CarouselApi>();
	const [current, setCurrent] = useState(0);

	// Plugin Autoplay (pattern officiel shadcn/ui)
	const plugin = useRef(
		Autoplay({
			delay: PRODUCT_CAROUSEL_CONFIG.AUTOPLAY_DELAY,
			stopOnInteraction: false, // Continue après interaction
			stopOnMouseEnter: true, // Pause au survol
			stopOnFocusIn: true, // Pause au focus (a11y)
		})
	);

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
	const scrollTo = useCallback(
		(index: number) => {
			api?.scrollTo(index);
		},
		[api]
	);

	if (products.length === 0) {
		return (
			<div className="relative h-full min-h-[480px] rounded-2xl bg-muted flex items-center justify-center">
				<p className="text-muted-foreground">Aucun bijou disponible</p>
			</div>
		);
	}

	return (
		<div className="max-w-7xl mx-auto">
			<div
				role="region"
				aria-label="Carrousel de bijoux vedettes"
				aria-roledescription="carrousel"
			>
				{/* Annonce pour lecteurs d'écran */}
				<div className="sr-only" aria-live="polite" aria-atomic="true">
					Bijou {current + 1} sur {products.length}
					{products[current] ? `: ${products[current].title}` : ""}
				</div>

				<Carousel
					setApi={setApi}
					plugins={[plugin.current]}
					opts={{
						align: "start",
						loop: true,
					}}
					className="w-full h-full group"
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
										preload={index === 0}
										quality={index === 0 ? 90 : 80}
										sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 50vw"
									/>

									{/* Overlay gradient */}
									<div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />

									{/* Info produit */}
									<div className="absolute bottom-0 left-0 right-0 p-4 pb-12 sm:p-6 sm:pb-6 text-white z-10">
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

					{/* Navigation - Fond blanc semi-transparent avec backdrop blur (meilleure pratique e-commerce) */}
					<CarouselPrevious
						variant="ghost"
						aria-label="Bijou précédent"
						className={cn(
							// Position
							"left-4 top-1/2 -translate-y-1/2",
							// Fond blanc semi-transparent avec effet verre dépoli
							"bg-white/80 backdrop-blur-sm",
							// Bordure subtile pour définir les contours
							"border border-white/40",
							// Forme ronde
							"rounded-full",
							// Shadow pour profondeur et lisibilité
							"shadow-lg hover:shadow-xl",
							// Icône sombre pour contraste sur fond blanc
							"text-foreground/80",
							// Hover state - fond plus opaque et icône plus sombre
							"hover:bg-white/90 hover:text-foreground hover:scale-105",
							// Cursor pointer
							"cursor-pointer",
							// Caché par défaut, visible au survol du carousel
							"opacity-60 group-hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100",
							// Disabled state - reste caché
							"disabled:opacity-0 disabled:cursor-not-allowed disabled:hover:scale-100",
							// Transition fluide
							"transition-all duration-300 ease-out"
						)}
					/>
					<CarouselNext
						variant="ghost"
						aria-label="Bijou suivant"
						className={cn(
							// Position
							"right-4 top-1/2 -translate-y-1/2",
							// Fond blanc semi-transparent avec effet verre dépoli
							"bg-white/80 backdrop-blur-sm",
							// Bordure subtile pour définir les contours
							"border border-white/40",
							// Forme ronde
							"rounded-full",
							// Shadow pour profondeur et lisibilité
							"shadow-lg hover:shadow-xl",
							// Icône sombre pour contraste sur fond blanc
							"text-foreground/80",
							// Hover state - fond plus opaque et icône plus sombre
							"hover:bg-white/90 hover:text-foreground hover:scale-105",
							// Cursor pointer
							"cursor-pointer",
							// Caché par défaut, visible au survol du carousel
							"opacity-60 group-hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100",
							// Disabled state - reste caché
							"disabled:opacity-0 disabled:cursor-not-allowed disabled:hover:scale-100",
							// Transition fluide
							"transition-all duration-300 ease-out"
						)}
					/>

					{/* Dots indicator - Responsive touch targets (32px mobile, 44px desktop) */}
					<div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1 sm:gap-2 z-20">
						{products.map((_, index) => (
							<Button
								key={index}
								onClick={() => scrollTo(index)}
								variant="ghost"
								size="icon"
								className={cn(
									// Zone tactile responsive: 32px mobile (acceptable pour éléments groupés), 44px desktop
									"h-10 w-10 sm:h-11 sm:w-11 p-0 cursor-pointer",
									// Indicateur visuel centré dans la zone tactile
									"flex items-center justify-center",
									"transition-all duration-300",
									// Hover subtil sur toute la zone
									"hover:bg-white/10"
								)}
								aria-label={`Aller au bijou ${index + 1}`}
								aria-current={current === index ? "true" : undefined}
							>
								<span
									className={cn(
										"block rounded-full transition-all duration-300",
										current === index
											? "h-2 w-8 sm:h-2.5 sm:w-10 bg-white shadow-md"
											: "h-2 w-2 sm:h-2.5 sm:w-2.5 bg-white/60 group-hover:bg-white/80"
									)}
								/>
							</Button>
						))}
					</div>
				</Carousel>
			</div>
		</div>
	);
}
