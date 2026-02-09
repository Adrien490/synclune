import { Fade, HandDrawnUnderline } from "@/shared/components/animations";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { SectionTitle } from "@/shared/components/section-title";
import { Button } from "@/shared/components/ui/button";
import { BRAND } from "@/shared/constants/brand";
import { SECTION_SPACING } from "@/shared/constants/spacing";
import { petitFormalScript } from "@/shared/styles/fonts";
import { cn } from "@/shared/utils/cn";
import {
	Clock,
	Gem,
	MessageCircle,
	RotateCcw,
	ShieldCheck,
	Sparkles,
	Truck,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { FaqAccordion } from "./faq-accordion";
import { FaqDoodles } from "./faq-doodles";
import type { AnswerSegment, FaqItemData } from "./faq-utils";
import {
	generateFaqSchema,
	parseAnswerSegments,
	validateFaqPlaceholders,
} from "./faq-utils";

function renderSegments(segments: AnswerSegment[]): ReactNode {
	if (segments.length === 1 && segments[0].type === "text") {
		return segments[0].value;
	}

	return (
		<>
			{segments.map((segment, i) =>
				segment.type === "text" ? (
					segment.value
				) : (
					<Link
						key={i}
						href={segment.href}
						className="underline underline-offset-2 hover:text-primary transition-colors"
					>
						{segment.text}
					</Link>
				),
			)}
		</>
	);
}

function renderAnswerWithLinks(answer: string, links?: FaqItemData["links"]): ReactNode {
	return renderSegments(parseAnswerSegments(answer, links));
}

const faqItems: FaqItemData[] = [
	{
		question: "Combien de temps pour recevoir ma commande ?",
		icon: <Truck className="size-4" />,
		answer:
			"Je prépare chaque commande avec soin sous 2-3 jours ouvrés. Ensuite, Colissimo te livre en 2-4 jours en France métropolitaine. Je t'envoie le numéro de suivi par email dès que ton colis part de mon atelier ! Tous les détails sont dans mes {{link0}}.",
		links: [{ text: "conditions de vente", href: "/cgv" }],
	},
	{
		question: "Je peux retourner un bijou si je change d'avis ?",
		icon: <RotateCcw className="size-4" />,
		answer:
			"Bien sûr ! Tu as 14 jours après réception pour changer d'avis. Renvoie-moi le bijou dans son état d'origine, non porté, et je te rembourse. Écris-moi par email pour qu'on organise ça ensemble. Plus d'infos sur les retours dans mes {{link0}}.",
		links: [{ text: "conditions de vente", href: "/cgv" }],
	},
	{
		question: "En quoi sont faits tes bijoux ?",
		icon: <Gem className="size-4" />,
		answer:
			"Je crée mes bijoux à partir de plastique fou (polystyrène) que je dessine et peins entièrement à la main. Ensuite, je les vernis pour protéger les couleurs. Pour les crochets et fermoirs, j'utilise de l'acier inoxydable hypoallergénique, parfait pour les peaux sensibles ! Découvre toutes mes {{link0}}.",
		links: [{ text: "collections", href: "/collections" }],
	},
	{
		question: "Comment je prends soin de mes bijoux ?",
		icon: <ShieldCheck className="size-4" />,
		answer:
			"Évite le contact avec l'eau, les parfums et les crèmes. Range-les à plat dans leur jolie pochette pour éviter les rayures. Avec ces petites attentions, ils resteront beaux pendant longtemps !",
	},
	{
		question: "Tu fais des bijoux sur-mesure ?",
		icon: <Sparkles className="size-4" />,
		answer:
			"Oui, j'adore ! Créer une pièce unique pour un cadeau spécial ou une envie particulière, c'est ce que je préfère. Écris-moi via la {{link0}} et on discute de ton projet ensemble.",
		links: [{ text: "page Personnalisation", href: "/personnalisation" }],
	},
	{
		question: "C'est quoi le délai pour une création personnalisée ?",
		icon: <Clock className="size-4" />,
		answer:
			"Compte environ 2-3 semaines pour une commande sur-mesure. Ce temps me permet de bien comprendre ce que tu veux, de créer des esquisses qu'on validera ensemble, et de réaliser ton bijou avec tout le soin qu'il mérite.",
	},
];

// Dev-time validation: warn if any FAQ item has unmatched link placeholders
if (process.env.NODE_ENV === "development") {
	validateFaqPlaceholders(faqItems);
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
		icon: item.icon,
	}));

	return (
		<section
			className={cn(
				"relative overflow-hidden bg-muted/20",
				"mask-t-from-90% mask-t-to-100% mask-b-from-90% mask-b-to-100%",
				SECTION_SPACING.section,
			)}
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
					<Fade y={MOTION_CONFIG.section.title.y} duration={MOTION_CONFIG.section.title.duration}>
						<SectionTitle id="faq-title">Questions fréquentes</SectionTitle>
						<HandDrawnUnderline color="var(--secondary)" delay={0.15} className="mx-auto mt-2" />
					</Fade>
					<Fade y={MOTION_CONFIG.section.subtitle.y} delay={MOTION_CONFIG.section.subtitle.delay} duration={MOTION_CONFIG.section.subtitle.duration}>
						<p className="mt-4 text-lg/7 tracking-normal antialiased text-muted-foreground max-w-xl mx-auto">
							Retrouve ici les réponses aux questions les plus posées
						</p>
					</Fade>
				</header>

				<div className="relative">
					<FaqDoodles />
					<FaqAccordion items={accordionItems} />
				</div>

				<Fade y={MOTION_CONFIG.section.cta.y} delay={MOTION_CONFIG.section.cta.delay} duration={MOTION_CONFIG.section.cta.duration} inView once>
					<div className="mt-12 max-w-3xl mx-auto bg-primary/5 border border-primary/15 rounded-2xl p-6 sm:p-8 text-center">
						<p className="text-muted-foreground mb-1 text-base">
							Tu n'as pas trouvé ta réponse ?
						</p>
						<p className={cn(petitFormalScript.className, "text-lg text-foreground/70 italic mb-5")}>
							Écris-moi, je réponds toujours !
						</p>
						<Button asChild variant="outline" size="lg" className="gap-2 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 ease-out">
							<a href={`mailto:${BRAND.contact.email}`}>
								<MessageCircle className="w-4 h-4" aria-hidden="true" />
								Me contacter
							</a>
						</Button>
					</div>
				</Fade>
			</div>
		</section>
	);
}
