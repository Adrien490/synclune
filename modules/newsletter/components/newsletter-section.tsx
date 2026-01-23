import { Fade, GlitterSparkles } from "@/shared/components/animations";
import { SectionTitle } from "@/shared/components/section-title";
import { cn } from "@/shared/utils/cn";
import { CONTAINER_CLASS, SECTION_SPACING } from "@/shared/constants/spacing";
import { dancingScript } from "@/shared/styles/fonts";
import { Sparkles } from "lucide-react";
import { NewsletterForm } from "./newsletter-form";

/**
 * Section newsletter pour la page d'accueil
 *
 * Storytelling: "Rejoins ma petite communauté créative"
 * - Headline personnelle
 * - Preview du contenu
 * - Incentive avec cadeau (guide des couleurs)
 * - Background GlitterSparkles subtil
 */
export function NewsletterSection() {
	return (
		<section
			aria-labelledby="newsletter-title"
			aria-describedby="newsletter-subtitle"
			className={cn(
				"relative overflow-hidden bg-muted/20",
				"mask-t-from-90% mask-t-to-100% mask-b-from-90% mask-b-to-100%",
				SECTION_SPACING.section
			)}
		>
			{/* Background animé subtil - désactivé sur mobile pour performance */}
			<div className="absolute inset-0 pointer-events-none" aria-hidden="true">
				<GlitterSparkles
					count={12}
					sizeRange={[4, 8]}
					glowIntensity={0.6}
					disableOnMobile
				/>
			</div>

			<div className={cn("relative z-10", CONTAINER_CLASS)}>
				{/* Header storytelling */}
				<header className="mb-8 text-center lg:mb-12">
					<Fade y={20} duration={0.6}>
						<SectionTitle id="newsletter-title">
							Rejoins ma petite communauté créative
							<Sparkles className="inline-block ml-2 w-6 h-6 text-secondary" aria-hidden="true" />
						</SectionTitle>
					</Fade>
					<Fade y={10} delay={0.1} duration={0.6}>
						<p
							id="newsletter-subtitle"
							className="mt-4 text-lg/7 tracking-normal antialiased text-muted-foreground max-w-2xl mx-auto"
						>
							Coulisses de l'atelier, avant-premières, inspirations du moment...
							Je partage tout avec toi, une fois par mois maximum !
						</p>
					</Fade>
				</header>

				{/* Formulaire centré */}
				<Fade y={15} delay={0.2} duration={0.6}>
					<div className="max-w-md mx-auto">
						<NewsletterForm />
					</div>
				</Fade>

				{/* Assurance anti-spam + signature */}
				<Fade y={10} delay={0.3} duration={0.6}>
					<div className="mt-6 text-center">
						<p className="text-sm text-muted-foreground/70">
							Pas de spam, promis. Désinscription en un clic.
						</p>
						<p className={`${dancingScript.className} mt-2 text-lg text-foreground/60 italic`}>
							Bye !
						</p>
					</div>
				</Fade>
			</div>
		</section>
	);
}
