import { HeroGradientWord } from "./hero-gradient-word";
import { SectionTitle } from "@/shared/components/section-title";

import { SplitTextCSS } from "@/shared/components/animations";
import { HeroCtaButtons } from "./hero-cta-buttons";
import { HeroHeartEasterEgg } from "./hero-heart-easter-egg";

/**
 * Homepage hero section.
 *
 * Displays the tagline ("Des bijoux colorés").
 *
 * The full title — including the multicolor gradient accent word
 * "colorés" — renders server-side for instant LCP and requires no
 * client JS. Fully static: no data fetch, in the initial SSR HTML.
 * The LCP image preload lives in LatestCreations.
 */
export function HeroSection() {
	return (
		<section
			id="hero-section"
			aria-labelledby="hero-title"
			aria-describedby="hero-subtitle"
			style={{ viewTransitionName: "shop-hero" }}
			className="relative flex min-h-[calc(60svh-var(--navbar-height,4rem))] items-center mask-b-from-90% mask-b-to-100% pt-[calc(var(--navbar-height,4rem)+1rem)] pb-10 sm:min-h-[calc(90svh-var(--navbar-height,5rem))] sm:mask-b-from-92% sm:pt-[calc(var(--navbar-height,5rem)+1.5rem)] sm:pb-16 md:pt-[calc(var(--navbar-height,5rem)+3rem)] md:pb-24 lg:min-h-dvh max-md:landscape:min-h-[calc(100svh-var(--navbar-height,4rem))]"
		>
			{/* Decorative background glows */}
			<div className="absolute inset-0 -z-10" aria-hidden="true">
				{/* Soft rose-blush glow behind the hero title — amplifies Synclune brand identity */}
				<div
					className="pointer-events-none absolute top-[28%] left-1/2 h-[65vh] w-[95vw] max-w-3xl -translate-x-1/2 rounded-full opacity-80 blur-3xl"
					style={{
						background: "radial-gradient(closest-side, var(--color-glow-pink), transparent 70%)",
					}}
				/>
				{/* Secondary lavender aurora bottom-left for multi-source warmth (creator vibe) */}
				<div
					className="pointer-events-none absolute bottom-[5%] left-[-10%] h-[45vh] w-[60vw] max-w-2xl rounded-full opacity-60 blur-3xl"
					style={{
						background:
							"radial-gradient(closest-side, var(--color-glow-lavender), transparent 70%)",
					}}
				/>
				<div className="bg-background/5 absolute inset-0" />
			</div>

			{/* `max-w-6xl` sans palier `2xl:` — le hero était le SEUL conteneur du
			 * storefront à s'élargir au-delà (`2xl:max-w-7xl`), ce qui produisait un
			 * décrochement d'alignement de 64px de chaque côté avec tout le reste de
			 * la page dès 1536px (audit responsive 2026-07-26, P2). La typographie
			 * du sous-titre continue de grossir en `2xl:`, elle : c'est l'échelle de
			 * texte qui doit suivre l'écran, pas la gouttière. */}
			<div className="relative z-10 container mx-auto max-w-6xl pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))] sm:pr-[max(1.5rem,env(safe-area-inset-right))] sm:pl-[max(1.5rem,env(safe-area-inset-left))] lg:pr-[max(2rem,env(safe-area-inset-right))] lg:pl-[max(2rem,env(safe-area-inset-left))]">
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
								className="text-foreground text-shadow-glow text-balance"
							>
								<span className="inline-flex flex-wrap items-center justify-center gap-x-[0.35em] gap-y-2">
									<SplitTextCSS>Des bijoux</SplitTextCSS>{" "}
									<HeroGradientWord>colorés</HeroGradientWord>
								</span>
							</SectionTitle>
							<p
								id="hero-subtitle"
								className="text-foreground mx-auto max-w-2xl text-lg/7 font-light tracking-tight text-pretty antialiased sm:text-xl/8 md:text-2xl/9 2xl:max-w-3xl 2xl:text-3xl/10"
							>
								{/* Distinct copy mobile/desktop (intentional UX — short on mobile, full on desktop).
								    Both in DOM = OK for SEO (Google dedupes), display:none respected by SR per viewport. */}
								<span className="sm:hidden">Faits main pour sublimer votre quotidien </span>
								<span className="hidden sm:inline">
									Créés à la main pour des occasions particulières, ou pour sublimer votre
									quotidien{" "}
								</span>
								{/* sr-only describes the decorative Heart icon for screen readers */}
								<span className="sr-only">avec amour</span>
								{/* Easter egg : le cœur éclate au clic (île client décorative, hors LCP h1) */}
								<HeroHeartEasterEgg />
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
