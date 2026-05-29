import { Fade, HandDrawnUnderline } from "@/shared/components/animations";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { SectionTitle } from "@/shared/components/section-title";
import { BRAND } from "@/shared/constants/brand";
import { HOME_FAQ_ITEMS } from "@/shared/constants/faq-items";
import { CONTAINER_CLASS, SECTION_SPACING } from "@/shared/constants/spacing";

import { HomeFaqAccordion } from "./home-faq-accordion";
import { SectionCtaLink } from "./section-cta-link";

// NOTE: pas de FAQPage JSON-LD ici — HOME_FAQ_ITEMS est un sous-ensemble de FAQ_ITEMS
// rendu sur /aide. Google déduplique automatiquement les FAQPage qui partagent du contenu
// et risque d'ignorer un des deux schemas. Le canonical reste /aide#faq pour les rich results.

export function HomeFaq() {
	return (
		<section
			id="home-faq"
			aria-labelledby="home-faq-title"
			aria-describedby="home-faq-subtitle"
			className={`bg-background relative scroll-mt-24 lg:scroll-mt-28 ${SECTION_SPACING.section}`}
			style={{ viewTransitionName: "home-faq" }}
		>
			<div className={CONTAINER_CLASS}>
				<header className="mb-10 text-center lg:mb-14">
					<Fade
						y={MOTION_CONFIG.section.title.y}
						duration={MOTION_CONFIG.section.title.duration}
						inView
						once
					>
						<SectionTitle id="home-faq-title">Questions fréquentes</SectionTitle>
						<HandDrawnUnderline
							delay={MOTION_CONFIG.section.underline.delay}
							className="mx-auto mt-2"
						/>
					</Fade>
					<Fade
						y={MOTION_CONFIG.section.subtitle.y}
						delay={MOTION_CONFIG.section.subtitle.delay}
						duration={MOTION_CONFIG.section.subtitle.duration}
						inView
						once
					>
						<p
							id="home-faq-subtitle"
							className="text-muted-foreground mx-auto mt-5 max-w-2xl text-lg/8 tracking-normal"
						>
							Livraison, retours, entretien, personnalisation : les réponses aux questions
							qu&apos;on me pose le plus souvent.
						</p>
					</Fade>
				</header>

				<HomeFaqAccordion items={HOME_FAQ_ITEMS} />

				<Fade
					y={MOTION_CONFIG.section.cta.y}
					delay={MOTION_CONFIG.section.cta.delay}
					duration={MOTION_CONFIG.section.cta.duration}
					inView
					once
					className="mt-10 flex flex-col items-center gap-3 text-center lg:mt-14"
				>
					<SectionCtaLink
						href={`mailto:${BRAND.contact.email}?subject=${encodeURIComponent("Une question sur Synclune")}`}
					>
						Une autre question ? Écrivez-moi
					</SectionCtaLink>
				</Fade>
			</div>
		</section>
	);
}
