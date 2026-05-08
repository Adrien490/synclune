import Link from "next/link";
import type { ReactNode } from "react";

import { Fade, HandDrawnUnderline } from "@/shared/components/animations";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { SectionTitle } from "@/shared/components/section-title";
import { BRAND } from "@/shared/constants/brand";
import { SITE_URL } from "@/shared/constants/seo-config";
import { CONTAINER_CLASS, SECTION_SPACING } from "@/shared/constants/spacing";
import { safeJsonLd } from "@/shared/utils/safe-json-ld";

import { HomeFaqAccordion } from "./home-faq-accordion";
import { SectionCtaLink } from "./section-cta-link";

const FAQ_DATE_MODIFIED = "2026-05-08";

interface FaqItem {
	id: string;
	question: string;
	answerText: string;
	answer: ReactNode;
}

export const HOME_FAQ_ITEMS: ReadonlyArray<FaqItem> = [
	{
		id: "fait-main",
		question: "Vos bijoux sont-ils vraiment faits main ?",
		answerText:
			"Oui, à 100 %. Chaque pièce est dessinée, peinte, cuite et assemblée dans mon atelier à Pessac. Aucune production en série, aucune sous-traitance — chaque création passe entre mes mains.",
		answer: (
			<>
				Oui, à <strong className="text-foreground font-semibold">100 %</strong>. Chaque pièce est
				dessinée, peinte, cuite et assemblée dans mon atelier à Pessac. Aucune production en série,
				aucune sous-traitance — chaque création passe entre mes mains.
			</>
		),
	},
	{
		id: "delai",
		question: "Quel est le délai de livraison en France ?",
		answerText:
			"Les commandes sont expédiées sous 1 à 3 jours ouvrés. La livraison France métropolitaine prend ensuite 2 à 4 jours ouvrés via Colissimo (4,99 €). L'Union Européenne est livrée en 5 à 7 jours ouvrés (9,50 €).",
		answer: (
			<>
				Les commandes sont expédiées sous{" "}
				<strong className="text-foreground font-semibold">1 à 3 jours ouvrés</strong>. La livraison
				France métropolitaine prend ensuite{" "}
				<strong className="text-foreground font-semibold">2 à 4 jours ouvrés</strong> via Colissimo
				(4,99 €). L&apos;Union Européenne est livrée en 5 à 7 jours ouvrés (9,50 €).
			</>
		),
	},
	{
		id: "entretien",
		question: "Comment entretenir mes bijoux faits main ?",
		answerText:
			"Évitez le contact prolongé avec l'eau, les parfums et les crèmes. Rangez-les dans un endroit sec, à l'abri de la lumière directe. Un coup de chiffon doux suffit à raviver leur éclat.",
		answer: (
			<>
				Évitez le contact prolongé avec l&apos;eau, les parfums et les crèmes. Rangez-les dans un
				endroit sec, à l&apos;abri de la lumière directe. Un coup de chiffon doux suffit à raviver
				leur éclat.
			</>
		),
	},
	{
		id: "personnalisation",
		question: "Puis-je personnaliser une création ?",
		answerText:
			"Bien sûr ! Couleurs, motifs, longueurs, gravures : la plupart des modèles peuvent être adaptés. Écrivez-moi directement à contact@synclune.fr, on en discute ensemble.",
		answer: (
			<>
				Bien sûr ! Couleurs, motifs, longueurs, gravures : la plupart des modèles peuvent être
				adaptés.{" "}
				<a
					href={`mailto:${BRAND.contact.email}?subject=Demande%20de%20personnalisation`}
					className="text-primary hover:text-primary/80 underline-offset-4 hover:underline focus-visible:underline"
				>
					Écrivez-moi
				</a>
				, on en discute ensemble.
			</>
		),
	},
	{
		id: "retours",
		question: "Quelle est votre politique de retour ?",
		answerText:
			"Vous avez 14 jours après réception pour me renvoyer un bijou non porté et dans son emballage d'origine. Échange ou remboursement intégral, frais de retour à la charge de l'acheteur. Détails complets sur la page rétractation.",
		answer: (
			<>
				Vous avez <strong className="text-foreground font-semibold">14 jours</strong> après
				réception pour me renvoyer un bijou non porté et dans son emballage d&apos;origine. Échange
				ou remboursement intégral, frais de retour à la charge de l&apos;acheteur.{" "}
				<Link
					href="/retractation"
					className="text-primary hover:text-primary/80 underline-offset-4 hover:underline focus-visible:underline"
				>
					Détails complets
				</Link>
				.
			</>
		),
	},
	{
		id: "editions-limitees",
		question: "Pourquoi vos pièces sont-elles si peu nombreuses ?",
		answerText:
			"Parce que tout est fait main et que je tiens à ce que chaque bijou reste unique. La plupart des modèles existent en moins de dix exemplaires. Si une pièce vous plaît, n'attendez pas trop.",
		answer: (
			<>
				Parce que tout est fait main et que je tiens à ce que chaque bijou reste unique. La plupart
				des modèles existent en{" "}
				<strong className="text-foreground font-semibold">moins de dix exemplaires</strong>. Si une
				pièce vous plaît, n&apos;attendez pas trop.
			</>
		),
	},
];

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
							color="var(--secondary)"
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
					className="mt-10 text-center lg:mt-14"
				>
					<SectionCtaLink
						href={`mailto:${BRAND.contact.email}?subject=Une%20question%20sur%20Synclune`}
						hapticPattern="selection"
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
