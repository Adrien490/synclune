import { HeroFloatingImages } from "./floating-images";
import { SectionTitle } from "@/shared/components/section-title";
import { Button } from "@/shared/components/ui/button";
import { RotatingWord } from "@/shared/components/ui/rotating-word";
import type { GetProductsReturn } from "@/modules/products/data/get-products";
import { extractHeroImages } from "../_utils/extract-hero-images";
import { Heart } from "lucide-react";
import Link from "next/link";
import { Suspense, use } from "react";
import { ParticleBackground, ScrollIndicator } from "./hero-decorations";

interface HeroSectionProps {
	productsPromise: Promise<GetProductsReturn>;
}

/**
 * Resolves productsPromise and renders floating images.
 * Isolated in its own Suspense boundary so the hero text/CTA
 * render immediately without waiting for the DB query.
 */
function HeroFloatingImagesAsync({
	productsPromise,
}: {
	productsPromise: Promise<GetProductsReturn>;
}) {
	const { products } = use(productsPromise);
	const heroImages = extractHeroImages(products);
	return <HeroFloatingImages images={heroImages} />;
}

/**
 * Homepage hero section.
 *
 * Displays rotating tagline, floating product images on desktop,
 * and particle background. Products come from the shared latest
 * creations fetch (no extra query).
 *
 * "Des bijoux" renders server-side for instant LCP — only the
 * rotating word requires client JS. Decorative animations
 * (particles, scroll indicator) are dynamically imported.
 */
export function HeroSection({ productsPromise }: HeroSectionProps) {
	return (
		<section
			id="hero-section"
			aria-labelledby="hero-title"
			aria-describedby="hero-subtitle"
			className="relative min-h-[calc(85dvh-4rem)] sm:min-h-[calc(90dvh-5rem)] lg:min-h-screen flex items-center pt-16 sm:pt-20 md:pt-28 pb-10 sm:pb-16 md:pb-24 mask-b-from-85% mask-b-to-100%"
		>
			{/* Particle background - dynamically imported (decorative) */}
			<div className="absolute top-0 inset-x-0 bottom-0 -z-10" aria-hidden="true">
				{/* Desktop particles */}
				<div className="hidden md:block absolute inset-0">
					<ParticleBackground
						disableOnTouch={false}
						shape={["heart", "pearl", "drop", "diamond", "circle"]}
						colors={[
							"var(--primary)",
							"var(--secondary)",
							"oklch(0.92 0.08 350)",
							"oklch(0.75 0.12 280)",
						]}
						count={10}
						size={[25, 90]}
						opacity={[0.3, 0.7]}
						blur={[4, 12]}
						animationStyle="drift"
						depthParallax={true}
					/>
				</div>
				{/* Mobile particles - smaller, subtler, fewer shapes */}
				<div className="md:hidden absolute inset-0">
					<ParticleBackground
						shape={["heart", "pearl", "circle"]}
						colors={[
							"var(--primary)",
							"var(--secondary)",
							"oklch(0.92 0.08 350)",
							"oklch(0.75 0.12 280)",
						]}
						count={6}
						size={[15, 50]}
						opacity={[0.2, 0.5]}
						blur={[3, 10]}
						animationStyle="drift"
						depthParallax={true}
					/>
				</div>
				<div className="absolute inset-0 bg-background/10" />
			</div>

			{/* Floating product images - Desktop only, streams in after products load */}
			<Suspense fallback={null}>
				<HeroFloatingImagesAsync productsPromise={productsPromise} />
			</Suspense>

			<div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl 2xl:max-w-7xl relative z-10">
				<div className="flex flex-col items-center">
					{/* Centered content */}
					<div className="space-y-5 sm:space-y-7 md:space-y-10 flex flex-col items-center">
						{/* Main title - "Des bijoux" is server-rendered for LCP */}
						<div className="space-y-4 sm:space-y-6 text-center w-full">
							<SectionTitle
								as="h1"
								size="hero"
								align="center"
								weight="normal"
								id="hero-title"
								className="text-foreground"
								itemProp="headline"
							>
								<span className="inline-flex items-center gap-[0.35em] flex-wrap justify-center">
									Des bijoux{" "}
									<RotatingWord
										words={["colorés", "uniques"]}
										duration={3500}
									/>
								</span>
							</SectionTitle>
							<p
								id="hero-subtitle"
								className="text-lg/7 sm:text-xl/8 md:text-2xl/9 2xl:text-3xl/10 text-foreground font-normal tracking-tight antialiased max-w-2xl 2xl:max-w-3xl mx-auto"
							>
								<span className="sm:hidden">
									Faits main pour sublimer votre quotidien{" "}
								</span>
								<span className="hidden sm:inline">
									Créés à la main pour des occasions particulières, ou pour
									sublimer votre quotidien{" "}
								</span>
								<span className="sr-only">avec amour</span>
								<Heart
									size={22}
									fill="currentColor"
									className="text-primary inline align-middle"
									aria-hidden="true"
								/>
							</p>
						</div>

						{/* CTA - Immediate render for LCP */}
						<div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
							<Button
								asChild
								size="lg"
								className="shadow-lg font-semibold w-full sm:w-auto"
							>
								<Link
									href="/produits"
									className="flex items-center justify-center"
								>
									Découvrir la boutique !
								</Link>
							</Button>
							<Button
								asChild
								size="lg"
								variant="secondary"
								className="shadow-md font-semibold w-full sm:w-auto"
							>
								<Link
									href="/personnalisation"
									className="flex items-center justify-center"
								>
									Personnalisation
								</Link>
							</Button>
						</div>

					</div>
				</div>
			</div>

			{/* Scroll indicator - dynamically imported (decorative) */}
			<ScrollIndicator
				targetIds={[
					"latest-creations",
					"collections",
				]}
				ariaLabel="Voir la suite"
				className="hidden sm:block"
			/>
		</section>
	);
}
