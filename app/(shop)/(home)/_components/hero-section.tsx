import { HeroFloatingImages } from "./floating-images";
import { HeroRotatingWord } from "./hero-rotating-word";
import { SectionTitle } from "@/shared/components/section-title";

import type { GetProductsReturn } from "@/modules/products/data/get-products";
import { extractHeroImages } from "../_utils/extract-hero-images";
import { SplitTextCSS } from "@/shared/components/animations";
import { Heart } from "lucide-react";
import { HeroCtaButtons } from "./hero-cta-buttons";
import { ParticleBackground } from "./hero-decorations";

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
 *
 * Awaits `productsPromise` inline (no Suspense) so the LCP image
 * `<link rel="preload">` is hoisted into the initial HTML head by
 * React 19 — saves ~2s LCP mobile vs streaming the hero in later.
 */
export async function HeroSection({
	productsPromise,
}: {
	productsPromise: Promise<GetProductsReturn>;
}) {
	const { products } = await productsPromise;
	const heroImages = extractHeroImages(products);

	return (
		<section
			id="hero-section"
			aria-labelledby="hero-title"
			aria-describedby="hero-subtitle"
			style={{ viewTransitionName: "shop-hero" }}
			className="relative flex min-h-[calc(60svh-var(--navbar-height,4rem))] items-center mask-b-from-90% mask-b-to-100% pt-[calc(var(--navbar-height,4rem)+1rem)] pb-10 sm:min-h-[calc(90svh-var(--navbar-height,5rem))] sm:mask-b-from-92% sm:pt-[calc(var(--navbar-height,5rem)+1.5rem)] sm:pb-16 md:pt-[calc(var(--navbar-height,5rem)+3rem)] md:pb-24 lg:min-h-screen max-md:landscape:min-h-[calc(100svh-var(--navbar-height,4rem))]"
		>
			{/* Particle background - dynamically imported (decorative) */}
			<div className="absolute inset-0 -z-10" aria-hidden="true">
				{/* Soft rose-blush glow behind the hero title — amplifies Synclune brand identity */}
				<div
					className="pointer-events-none absolute top-[28%] left-1/2 h-[55vh] w-[85vw] max-w-3xl -translate-x-1/2 rounded-full opacity-70 blur-3xl"
					style={{
						background: "radial-gradient(closest-side, var(--color-glow-pink), transparent 70%)",
					}}
				/>
				{/* Single instance — component handles responsive internally
            (desktop: count particles, mobile: ceil(count * mobileCountRatio) with reduced blur) */}
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
					opacity={[0.25, 0.55]}
					blur={[8, 24]}
					animationStyle="drift"
					depthParallax={true}
					mobileCountRatio={0.4}
				/>
				<div className="bg-background/10 absolute inset-0" />
			</div>

			{/* Floating product images - Desktop only. Server-rendered with LCP image
			    inside so React 19 emits `<link rel="preload">` in the initial HTML. */}
			<HeroFloatingImages images={heroImages} />

			<div className="relative z-10 container mx-auto max-w-6xl pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))] sm:pr-[max(1.5rem,env(safe-area-inset-right))] sm:pl-[max(1.5rem,env(safe-area-inset-left))] lg:pr-[max(2rem,env(safe-area-inset-right))] lg:pl-[max(2rem,env(safe-area-inset-left))] 2xl:max-w-7xl">
				<div className="flex flex-col items-center">
					{/* Centered content */}
					<div className="flex flex-col items-center gap-y-5 sm:gap-y-7 md:gap-y-10 max-md:landscape:gap-y-3">
						{/* Main title - "Des bijoux" is server-rendered for LCP */}
						<div className="w-full space-y-4 text-center sm:space-y-6">
							<SectionTitle
								as="h1"
								size="hero"
								align="center"
								weight="light"
								id="hero-title"
								className="text-foreground"
							>
								<span className="inline-flex flex-wrap items-center justify-center gap-x-[0.35em] gap-y-2">
									<SplitTextCSS>Des bijoux</SplitTextCSS>{" "}
									<HeroRotatingWord words={["colorés", "uniques"]} duration={3500} />
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
								{/* sr-only describes the decorative Heart icon for screen readers */}
								<span className="sr-only">avec amour</span>
								<Heart
									fill="currentColor"
									className="text-primary inline-block size-[1.1em] align-[-0.15em]"
									aria-hidden="true"
								/>
							</p>
						</div>

						{/* CTA - Immediate render for LCP */}
						<HeroCtaButtons />
					</div>
				</div>
			</div>
		</section>
	);
}
