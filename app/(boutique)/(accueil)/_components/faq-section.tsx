"use client";

import { Fade, Stagger } from "@/shared/components/animations";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/shared/components/ui/accordion";
import { SectionTitle } from "@/shared/components/section-title";
import { SECTION_SPACING } from "@/shared/constants/spacing";
import { cn } from "@/shared/utils/cn";
import Script from "next/script";

interface FaqItem {
	question: string;
	answer: string;
}

interface FaqCategory {
	id: string;
	items: FaqItem[];
}

const faqCategories: FaqCategory[] = [
	{
		id: "shipping",
		items: [
			{
				question: "Quels sont les délais de livraison ?",
				answer:
					"Les commandes sont préparées avec soin sous 2-3 jours ouvrés. L'envoi se fait via Colissimo, avec une livraison en 2-4 jours en France métropolitaine. Tu recevras un email avec le numéro de suivi dès l'expédition !",
			},
			{
				question: "Puis-je retourner un bijou si je ne suis pas satisfait(e) ?",
				answer:
					"Bien sûr ! Tu disposes de 14 jours après réception pour changer d'avis. Les bijoux doivent être retournés dans leur état d'origine, non portés. Contacte-moi par email pour organiser le retour.",
			},
		],
	},
	{
		id: "products",
		items: [
			{
				question: "En quoi sont fabriqués vos bijoux ?",
				answer:
					"Mes bijoux sont fabriqués à partir de plastique fou (polystyrène) que je dessine et peins à la main. Je les vernis ensuite pour les protéger. Les apprêts (crochets, fermoirs) sont en acier inoxydable hypoallergénique.",
			},
			{
				question: "Comment entretenir mes bijoux ?",
				answer:
					"Évite le contact avec l'eau, les parfums et produits cosmétiques. Range-les à plat dans leur pochette pour éviter les rayures. Avec un peu d'attention, ils te dureront longtemps !",
			},
		],
	},
	{
		id: "customization",
		items: [
			{
				question: "Proposez-vous des créations personnalisées ?",
				answer:
					"Oui, j'adore créer des pièces uniques sur demande ! Que ce soit pour un cadeau spécial ou une envie particulière, contacte-moi via la page Personnalisation pour en discuter.",
			},
			{
				question: "Quel est le délai pour une commande sur-mesure ?",
				answer:
					"Compte environ 2-3 semaines pour une création personnalisée. Ce délai me permet de bien comprendre ta demande, créer des esquisses et réaliser ton bijou avec tout le soin qu'il mérite.",
			},
		],
	},
];

function generateFaqSchema(categories: FaqCategory[]) {
	const allQuestions = categories.flatMap((cat) => cat.items);
	return {
		"@context": "https://schema.org",
		"@type": "FAQPage",
		mainEntity: allQuestions.map((item) => ({
			"@type": "Question",
			name: item.question,
			acceptedAnswer: {
				"@type": "Answer",
				text: item.answer,
			},
		})),
	};
}

/**
 * Section FAQ - Questions fréquentes avec schema SEO
 *
 * Pattern : Client Component pour l'interactivité Accordion
 * - 6 questions réparties en 3 catégories
 * - Schema FAQPage JSON-LD pour rich snippets Google
 * - Accordion avec animation fluide
 * - Design cohérent avec les autres sections homepage
 */
export function FaqSection() {
	const faqSchema = generateFaqSchema(faqCategories);

	return (
		<section
			className={cn("bg-background", SECTION_SPACING.section)}
			aria-labelledby="faq-title"
		>
			{/* JSON-LD Schema pour SEO */}
			<Script
				id="faq-schema"
				type="application/ld+json"
				strategy="beforeInteractive"
			>
				{JSON.stringify(faqSchema)}
			</Script>

			<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
				<header className="text-center mb-10 lg:mb-12">
					<Fade y={20} duration={0.6}>
						<SectionTitle id="faq-title">Questions fréquentes</SectionTitle>
					</Fade>
					<Fade y={10} delay={0.15} duration={0.6}>
						<p className="mt-4 text-lg/7 tracking-normal antialiased text-muted-foreground max-w-xl mx-auto">
							Retrouve ici les réponses aux questions les plus posées
						</p>
					</Fade>
				</header>

				<Accordion type="multiple" className="max-w-3xl mx-auto">
					<Stagger stagger={0.06} y={20} once className="space-y-3">
						{faqCategories.flatMap((category) =>
							category.items.map((item, idx) => (
								<AccordionItem
									key={`${category.id}-${idx}`}
									value={`${category.id}-${idx}`}
									className="bg-muted/30 rounded-xl px-5 border shadow-sm focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
								>
									<AccordionTrigger className="text-base font-medium text-left py-5">
										{item.question}
									</AccordionTrigger>
									<AccordionContent className="text-muted-foreground text-base/7 pb-5">
										{item.answer}
									</AccordionContent>
								</AccordionItem>
							))
						)}
					</Stagger>
				</Accordion>
			</div>
		</section>
	);
}
