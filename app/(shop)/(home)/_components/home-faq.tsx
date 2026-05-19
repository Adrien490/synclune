import { Fade, HandDrawnUnderline } from "@/shared/components/animations";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { SectionTitle } from "@/shared/components/section-title";
import { BRAND } from "@/shared/constants/brand";
import { FAQ_DATE_MODIFIED, HOME_FAQ_ITEMS } from "@/shared/constants/faq-items";
import { SITE_URL } from "@/shared/constants/seo-config";
import { CONTAINER_CLASS, SECTION_SPACING } from "@/shared/constants/spacing";
import { safeJsonLd } from "@/shared/utils/safe-json-ld";

import { HomeFaqAccordion } from "./home-faq-accordion";
import { SectionCtaLink } from "./section-cta-link";

export { HOME_FAQ_ITEMS };

const faqPageSchema = {
	"@context": "https://schema.org",
	"@type": "FAQPage",
	"@id": `${SITE_URL}/#faq`,
	inLanguage: "fr-FR",
	dateModified: FAQ_DATE_MODIFIED,
	mainEntity: HOME_FAQ_ITEMS.map((item) => ({
		"@type": "Question",
		name: item.question,
		acceptedAnswer: {
			"@type": "Answer",
			text: item.answerText,
		},
	})),
};

export function HomeFaq() {
	return (
		<section
			id="home-faq"
			aria-labelledby="home-faq-title"
			aria-describedby="home-faq-subtitle"
			className={`bg-background relative scroll-mt-24 lg:scroll-mt-28 ${SECTION_SPACING.section}`}
			style={{ viewTransitionName: "home-faq" }}
		>
			{/* SAFE: serialized via safeJsonLd (no user HTML) */}
			{/* react-doctor-disable-next-line react/no-danger */}
			<script
				id="home-faq-schema"
				type="application/ld+json"
				dangerouslySetInnerHTML={{ __html: safeJsonLd(faqPageSchema) }}
			/>
			<div className={CONTAINER_CLASS}>
				<header className="mb-10 text-center lg:mb-14">
					<Fade y={MOTION_CONFIG.section.title.y} duration={MOTION_CONFIG.section.title.duration}>
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
						href={`mailto:${BRAND.contact.email}?subject=Une%20question%20sur%20Synclune`}
						aria-describedby="home-faq-cta-description"
					>
						Une autre question ? Écrivez-moi
					</SectionCtaLink>
					<span id="home-faq-cta-description" className="sr-only">
						Envoyer un email à Synclune pour toute question non couverte par la FAQ
					</span>
				</Fade>
			</div>
		</section>
	);
}
