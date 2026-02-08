import { SectionTitle } from "@/shared/components/section-title";
import { Button } from "@/shared/components/ui/button";
import { SECTION_SPACING } from "@/shared/constants/spacing";
import { cn } from "@/shared/utils/cn";
import { MessageCircle } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { FaqAccordion } from "./faq-accordion";

interface FaqLink {
	text: string;
	href: string;
}

interface FaqItemData {
	question: string;
	answer: string;
	links?: FaqLink[];
}

const LINK_PLACEHOLDER_REGEX = /\{\{link(\d+)\}\}/g;

function renderAnswerWithLinks(answer: string, links?: FaqLink[]): ReactNode {
	if (!links || links.length === 0) {
		return answer;
	}

	const parts: ReactNode[] = [];
	let lastIndex = 0;

	for (const match of answer.matchAll(LINK_PLACEHOLDER_REGEX)) {
		const matchIndex = match.index!;

		if (matchIndex > lastIndex) {
			parts.push(answer.slice(lastIndex, matchIndex));
		}

		const linkIndex = Number.parseInt(match[1], 10);
		const link = links[linkIndex];

		if (link) {
			parts.push(
				<Link
					key={matchIndex}
					href={link.href}
					className="underline underline-offset-2 hover:text-foreground transition-colors"
				>
					{link.text}
				</Link>,
			);
		} else {
			parts.push(match[0]);
		}

		lastIndex = matchIndex + match[0].length;
	}

	if (lastIndex < answer.length) {
		parts.push(answer.slice(lastIndex));
	}

	return <>{parts}</>;
}

function getPlainTextAnswer(answer: string, links?: FaqLink[]): string {
	if (!links || links.length === 0) {
		return answer;
	}

	return answer.replace(LINK_PLACEHOLDER_REGEX, (_, index) => {
		const link = links[Number.parseInt(index, 10)];
		return link ? link.text : "";
	});
}

const faqItems: FaqItemData[] = [
	{
		question: "Combien de temps pour recevoir ma commande ?",
		answer:
			"Je prépare chaque commande avec soin sous 2-3 jours ouvrés. Ensuite, Colissimo te livre en 2-4 jours en France métropolitaine. Je t'envoie le numéro de suivi par email dès que ton colis part de mon atelier ! Tous les détails sont dans mes {{link0}}.",
		links: [{ text: "conditions de vente", href: "/cgv" }],
	},
	{
		question: "Je peux retourner un bijou si je change d'avis ?",
		answer:
			"Bien sûr ! Tu as 14 jours après réception pour changer d'avis. Renvoie-moi le bijou dans son état d'origine, non porté, et je te rembourse. Écris-moi par email pour qu'on organise ça ensemble. Plus d'infos sur les retours dans mes {{link0}}.",
		links: [{ text: "conditions de vente", href: "/cgv" }],
	},
	{
		question: "En quoi sont faits tes bijoux ?",
		answer:
			"Je crée mes bijoux à partir de plastique fou (polystyrène) que je dessine et peins entièrement à la main. Ensuite, je les vernis pour protéger les couleurs. Pour les crochets et fermoirs, j'utilise de l'acier inoxydable hypoallergénique, parfait pour les peaux sensibles ! Découvre toutes mes {{link0}}.",
		links: [{ text: "collections", href: "/collections" }],
	},
	{
		question: "Comment je prends soin de mes bijoux ?",
		answer:
			"Évite le contact avec l'eau, les parfums et les crèmes. Range-les à plat dans leur jolie pochette pour éviter les rayures. Avec ces petites attentions, ils resteront beaux pendant longtemps !",
	},
	{
		question: "Tu fais des bijoux sur-mesure ?",
		answer:
			"Oui, j'adore ! Créer une pièce unique pour un cadeau spécial ou une envie particulière, c'est ce que je préfère. Écris-moi via la {{link0}} et on discute de ton projet ensemble.",
		links: [{ text: "page Personnalisation", href: "/personnalisation" }],
	},
	{
		question: "C'est quoi le délai pour une création personnalisée ?",
		answer:
			"Compte environ 2-3 semaines pour une commande sur-mesure. Ce temps me permet de bien comprendre ce que tu veux, de créer des esquisses qu'on validera ensemble, et de réaliser ton bijou avec tout le soin qu'il mérite.",
	},
];

function generateFaqSchema(items: FaqItemData[]) {
	return {
		"@context": "https://schema.org",
		"@type": "FAQPage",
		inLanguage: "fr-FR",
		mainEntity: items.map((item) => ({
			"@type": "Question",
			name: item.question,
			acceptedAnswer: {
				"@type": "Answer",
				text: getPlainTextAnswer(item.answer, item.links),
			},
		})),
	};
}

const faqSchema = generateFaqSchema(faqItems);

/**
 * FAQ section with FAQPage JSON-LD schema for rich snippets.
 *
 * Server Component with client island for the Accordion.
 */
export function FaqSection() {
	const accordionItems = faqItems.map((item) => ({
		question: item.question,
		answer: renderAnswerWithLinks(item.answer, item.links),
	}));

	return (
		<section
			className={cn("bg-background", SECTION_SPACING.section)}
			aria-labelledby="faq-title"
		>
			{/* JSON-LD Schema for SEO */}
			<script
				id="faq-schema"
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: JSON.stringify(faqSchema).replace(/</g, "\\u003c"),
				}}
			/>

			<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
				<header className="text-center mb-10 lg:mb-12">
					<SectionTitle id="faq-title">Questions fréquentes</SectionTitle>
					<p className="mt-4 text-lg/7 tracking-normal antialiased text-muted-foreground max-w-xl mx-auto">
						Retrouve ici les réponses aux questions les plus posées
					</p>
				</header>

				<FaqAccordion items={accordionItems} />

				<div className="mt-10 text-center">
					<p className="text-muted-foreground mb-4">
						Une autre question ? N'hésite pas à m'écrire directement !
					</p>
					<Button asChild variant="outline" size="lg" className="gap-2 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 ease-out">
						<Link href="/contact">
							<MessageCircle className="w-4 h-4" aria-hidden="true" />
							Me contacter
						</Link>
					</Button>
				</div>
			</div>
		</section>
	);
}
