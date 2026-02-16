import { Fade, HandDrawnUnderline } from "@/shared/components/animations";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { SectionTitle } from "@/shared/components/section-title";
import { cn } from "@/shared/utils/cn";
import { CONTAINER_CLASS, SECTION_SPACING } from "@/shared/constants/spacing";

import { NewsletterForm } from "@/modules/newsletter/components/newsletter-form";
import { cacheLife, cacheTag } from "next/cache";

/** Homepage newsletter subscription section with animated form. */
export async function NewsletterSection() {
	"use cache";
	cacheLife("reference");
	cacheTag("newsletter-section");

	return (
		<section
			aria-labelledby="newsletter-title"
			aria-describedby="newsletter-subtitle"
			className={cn(
				"relative overflow-hidden bg-muted/20",
				"mask-t-from-90% mask-t-to-100% mask-b-from-90% mask-b-to-100%",
				SECTION_SPACING.section,
			)}
		>
			<div className={CONTAINER_CLASS}>
				{/* Storytelling header */}
				<header className="mb-8 text-center lg:mb-12">
					<Fade y={MOTION_CONFIG.section.title.y} duration={MOTION_CONFIG.section.title.duration}>
						<SectionTitle id="newsletter-title">Ma newsletter</SectionTitle>
						<HandDrawnUnderline color="var(--secondary)" delay={0.15} className="mx-auto mt-2" />
					</Fade>
					<Fade y={MOTION_CONFIG.section.subtitle.y} delay={MOTION_CONFIG.section.subtitle.delay} duration={MOTION_CONFIG.section.subtitle.duration}>
						<p
							id="newsletter-subtitle"
							className="mt-4 text-lg/7 tracking-normal antialiased text-muted-foreground max-w-2xl mx-auto"
						>
							Les nouveautés en avant-première, des offres exclusives et
							des surprises réservées aux abonnées !
						</p>
					</Fade>
				</header>

				{/* Centered form */}
				<Fade inView once y={MOTION_CONFIG.section.cta.y} delay={MOTION_CONFIG.section.cta.delay} duration={MOTION_CONFIG.section.cta.duration}>
					<div className="max-w-md mx-auto">
						<NewsletterForm />
					</div>
				</Fade>

				{/* Anti-spam assurance */}
				<Fade inView once y={MOTION_CONFIG.section.subtitle.y} delay={MOTION_CONFIG.section.cta.delay} duration={MOTION_CONFIG.section.subtitle.duration}>
					<p className="mt-6 text-center text-sm text-muted-foreground">
						1 à 2 emails par mois maximum. Désinscription en un clic.
					</p>
				</Fade>
			</div>
		</section>
	);
}
