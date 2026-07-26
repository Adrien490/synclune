import { Fade } from "@/shared/components/animations";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { BRAND } from "@/shared/constants/brand";
import { HOME_FAQ_ITEMS } from "@/shared/constants/faq-items";
import { CONTAINER_CLASS, SECTION_SPACING } from "@/shared/constants/spacing";

import { HomeFaqAccordion } from "./home-faq-accordion";
import { SectionCtaLink } from "./section-cta-link";
import { SectionDivider } from "./section-divider";
import { SectionHeader } from "./section-header";

// NOTE: pas de FAQPage JSON-LD ici — HOME_FAQ_ITEMS est un sous-ensemble de FAQ_ITEMS
// rendu sur /aide. Google déduplique automatiquement les FAQPage qui partagent du contenu
// et risque d'ignorer un des deux schemas. Le canonical reste /aide#faq pour les rich results.

export function HomeFaq() {
	const cta = (
		<SectionCtaLink
			href={`mailto:${BRAND.contact.email}?subject=${encodeURIComponent("Une question sur Synclune")}`}
		>
			Une autre question ? Écrivez-moi
		</SectionCtaLink>
	);

	return (
		<section
			id="home-faq"
			data-accent="rose"
			aria-labelledby="home-faq-title"
			aria-describedby="home-faq-subtitle"
			className={`bg-background relative scroll-mt-24 lg:scroll-mt-28 ${SECTION_SPACING.section}`}
			style={{ viewTransitionName: "home-faq" }}
		>
			<div className={CONTAINER_CLASS}>
				<SectionDivider />
				{/* Desktop : 2 colonnes — header + CTA sticky à gauche, accordion à droite.
				    Casse le patron « header centré + contenu empilé » des autres sections.
				    Mobile : flux vertical historique (header centré, accordion, CTA). */}
				<div className="lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-12">
					<div className="lg:sticky lg:top-[calc(var(--navbar-height)+2rem)]">
						<SectionHeader
							titleId="home-faq-title"
							subtitleId="home-faq-subtitle"
							align="left"
							title="Questions fréquentes"
							subtitle="Livraison, retours, entretien, personnalisation : les réponses aux questions qu'on me pose le plus souvent."
							className="lg:mb-8"
						/>
						<Fade
							y={MOTION_CONFIG.section.cta.y}
							delay={MOTION_CONFIG.section.cta.delay}
							duration={MOTION_CONFIG.section.cta.duration}
							inView
							once
							className="hidden lg:block"
						>
							{cta}
						</Fade>
					</div>

					<div className="min-w-0">
						<HomeFaqAccordion items={HOME_FAQ_ITEMS} />
					</div>
				</div>

				{/* CTA mobile/tablette — la colonne gauche sticky n'existe qu'à partir de lg. */}
				<Fade
					y={MOTION_CONFIG.section.cta.y}
					delay={MOTION_CONFIG.section.cta.delay}
					duration={MOTION_CONFIG.section.cta.duration}
					inView
					once
					className="mt-10 flex flex-col items-center gap-3 text-center lg:hidden"
				>
					{cta}
				</Fade>
			</div>
		</section>
	);
}
