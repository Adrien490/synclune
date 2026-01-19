"use client";

import { Fade, Stagger } from "@/shared/components/animations";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/shared/components/ui/accordion";
import { SectionTitle } from "@/shared/components/section-title";
import { Button } from "@/shared/components/ui/button";
import { SECTION_SPACING } from "@/shared/constants/spacing";
import { cn } from "@/shared/utils/cn";
import { MessageCircle } from "lucide-react";
import Link from "next/link";

interface FaqItem {
	question: string;
	answer: string;
}

interface FaqCategory {
	id: string;
	items: FaqItem[];
}

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

const faqCategories: FaqCategory[] = [
	{
		id: "shipping",
		items: [
			{
				question: "Combien de temps pour recevoir ma commande ?",
				answer:
					"Je prépare chaque commande avec soin sous 2-3 jours ouvrés. Ensuite, Colissimo te livre en 2-4 jours en France métropolitaine. Je t'envoie le numéro de suivi par email dès que ton colis part de mon atelier !",
			},
			{
				question: "Je peux retourner un bijou si je change d'avis ?",
				answer:
					"Bien sûr ! Tu as 14 jours après réception pour changer d'avis. Renvoie-moi le bijou dans son état d'origine, non porté, et je te rembourse. Écris-moi par email pour qu'on organise ça ensemble.",
			},
		],
	},
	{
		id: "products",
		items: [
			{
				question: "En quoi sont faits tes bijoux ?",
				answer:
					"Je crée mes bijoux à partir de plastique fou (polystyrène) que je dessine et peins entièrement à la main. Ensuite, je les vernis pour protéger les couleurs. Pour les crochets et fermoirs, j'utilise de l'acier inoxydable hypoallergénique, parfait pour les peaux sensibles !",
			},
			{
				question: "Comment je prends soin de mes bijoux ?",
				answer:
					"Évite le contact avec l'eau, les parfums et les crèmes. Range-les à plat dans leur jolie pochette pour éviter les rayures. Avec ces petites attentions, ils resteront beaux pendant longtemps !",
			},
		],
	},
	{
		id: "customization",
		items: [
			{
				question: "Tu fais des bijoux sur-mesure ?",
				answer:
					"Oui, j'adore ! Créer une pièce unique pour un cadeau spécial ou une envie particulière, c'est ce que je préfère. Écris-moi via la page Personnalisation et on discute de ton projet ensemble.",
			},
			{
				question: "C'est quoi le délai pour une création personnalisée ?",
				answer:
					"Compte environ 2-3 semaines pour une commande sur-mesure. Ce temps me permet de bien comprendre ce que tu veux, de créer des esquisses qu'on validera ensemble, et de réaliser ton bijou avec tout le soin qu'il mérite.",
			},
		],
	},
];

// Schema JSON-LD généré une seule fois (données statiques)
const faqSchema = generateFaqSchema(faqCategories);

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
	return (
		<section
			className={cn("bg-background", SECTION_SPACING.section)}
			aria-labelledby="faq-title"
		>
			{/* JSON-LD Schema pour SEO */}
			<script
				id="faq-schema"
				type="application/ld+json"
				dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
			/>

			<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
				<header className="text-center mb-10 lg:mb-12">
					<Fade y={20} duration={0.6}>
						<SectionTitle id="faq-title">Questions fréquentes</SectionTitle>
					</Fade>
					<Fade y={10} delay={0.1} duration={0.6}>
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

				{/* CTA Contact */}
				<Fade y={15} delay={0.4} duration={0.5} inView once>
					<div className="mt-10 text-center">
						<p className="text-muted-foreground mb-4">
							Une autre question ? N'hésite pas à m'écrire directement !
						</p>
						<Button asChild variant="outline" size="lg" className="gap-2">
							<Link href="/contact">
								<MessageCircle className="w-4 h-4" aria-hidden="true" />
								Me contacter
							</Link>
						</Button>
					</div>
				</Fade>
			</div>
		</section>
	);
}
