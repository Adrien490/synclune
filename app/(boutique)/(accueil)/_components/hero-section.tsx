import { HeroFloatingImages } from "./floating-images";
import { SectionTitle } from "@/shared/components/section-title";
import { Button } from "@/shared/components/ui/button";
import { RotatingWord } from "@/shared/components/ui/rotating-word";
import type { GetProductsReturn } from "@/modules/products/data/get-products";
import { extractHeroImages } from "../_utils/extract-hero-images";
import { SplitText } from "@/shared/components/animations";
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
			className="relative flex min-h-[calc(60dvh-4rem)] items-center mask-b-from-90% mask-b-to-100% pt-16 pb-10 sm:min-h-[calc(90dvh-5rem)] sm:mask-b-from-85% sm:pt-20 sm:pb-16 md:pt-28 md:pb-24 lg:min-h-screen"
		>
			{/* Particle background - dynamically imported (decorative) */}
			<div className="absolute inset-x-0 top-0 bottom-0 -z-10" aria-hidden="true">
				{/* Single instance — component handles responsive internally
            (desktop: count particles, mobile: ceil(count/2) with reduced blur) */}
				<ParticleBackground
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
				<div className="bg-background/10 absolute inset-0" />
			</div>

			{/* Floating product images - Desktop only, streams in after products load */}
			<Suspense fallback={null}>
				<HeroFloatingImagesAsync productsPromise={productsPromise} />
			</Suspense>

			<div className="relative z-10 container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 2xl:max-w-7xl">
				<div className="flex flex-col items-center">
					{/* Centered content */}
					<div className="flex flex-col items-center space-y-5 sm:space-y-7 md:space-y-10">
						{/* Main title - "Des bijoux" is server-rendered for LCP */}
						<div className="w-full space-y-4 text-center sm:space-y-6">
							<SectionTitle
								as="h1"
								size="hero"
								align="center"
								weight="normal"
								id="hero-title"
								className="text-foreground"
							>
								<span className="inline-flex flex-wrap items-center justify-center gap-[0.35em]">
									<SplitText>Des bijoux</SplitText>{" "}
									<RotatingWord words={["colorés", "uniques"]} duration={3500} />
								</span>
							</SectionTitle>
							<p
								id="hero-subtitle"
								className="text-foreground mx-auto max-w-2xl text-lg/7 font-light tracking-tight antialiased sm:text-xl/8 md:text-2xl/9 2xl:max-w-3xl 2xl:text-3xl/10"
							>
								<span className="sm:hidden">Faits main pour sublimer votre quotidien </span>
								<span className="hidden sm:inline">
									Créés à la main pour des occasions particulières, ou pour sublimer votre
									quotidien{" "}
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
						<div className="flex w-full flex-col gap-4 sm:w-auto sm:flex-row sm:gap-5">
							<Button
								asChild
								size="lg"
								className="w-full font-semibold tracking-wide shadow-lg sm:w-auto"
							>
								<Link href="/produits" className="flex items-center justify-center">
									Découvrir la boutique
								</Link>
							</Button>
							<Button
								asChild
								size="lg"
								variant="secondary"
								className="w-full font-semibold shadow-md sm:w-auto"
							>
								<Link href="/personnalisation" className="flex items-center justify-center">
									Créer mon bijou
								</Link>
							</Button>
						</div>
					</div>
				</div>
			</div>

			{/* Scroll indicator - dynamically imported (decorative, hidden on mobile) */}
			<ScrollIndicator
				targetIds={["latest-creations", "collections"]}
				ariaLabel="Voir la suite"
				className="hidden sm:block"
			/>
		</section>
	);
}
