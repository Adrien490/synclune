import { Fade, HandDrawnUnderline } from "@/shared/components/animations";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { SectionTitle } from "@/shared/components/section-title";
import { Button } from "@/shared/components/ui/button";
import { BRAND } from "@/shared/constants/brand";
import { CONTAINER_CLASS, SECTION_SPACING } from "@/shared/constants/spacing";
import { petitFormalScript } from "@/shared/styles/fonts";
import { cn } from "@/shared/utils/cn";
import { MessageCircle } from "lucide-react";
import { cacheLife, cacheTag } from "next/cache";
import Link from "next/link";
import type { ReactNode } from "react";
import { FaqAccordion } from "./faq-accordion";
import { FaqDoodles } from "./faq-doodles";
import type { AnswerSegment, FaqItemData } from "./faq-utils";
import { generateFaqSchema, parseAnswerSegments, validateFaqPlaceholders } from "./faq-utils";

function renderSegments(segments: AnswerSegment[]): ReactNode {
	const first = segments[0];
	if (segments.length === 1 && first?.type === "text") {
		return first.value;
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
						className="hover:text-primary underline underline-offset-2 transition-colors"
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
		answer:
			"Je prépare chaque commande avec soin sous 2-3 jours ouvrés. Ensuite, Colissimo vous livre en 2-4 jours en France métropolitaine. Je vous envoie le numéro de suivi par email dès que votre colis part de mon atelier ! Tous les détails sont dans mes {{link0}}.",
		links: [{ text: "conditions de vente", href: "/cgv" }],
	},
	{
		question: "Je peux retourner un bijou si je change d'avis ?",
		answer:
			"Bien sûr ! Vous avez 14 jours après réception pour changer d'avis. Renvoyez-moi le bijou dans son état d'origine, non porté, et je vous rembourse. Écrivez-moi par email pour qu'on organise ça ensemble. Plus d'infos sur les retours dans mes {{link0}}.",
		links: [{ text: "conditions de vente", href: "/cgv" }],
	},
	{
		question: "En quoi sont faits vos bijoux ?",
		answer:
			"Je crée mes bijoux à partir de plastique fou (polystyrène) que je dessine et peins entièrement à la main. Ensuite, je les vernis pour protéger les couleurs. Pour les crochets et fermoirs, j'utilise de l'acier inoxydable hypoallergénique, parfait pour les peaux sensibles ! Découvrez toutes mes {{link0}}.",
		links: [{ text: "collections", href: "/collections" }],
	},
	{
		question: "Comment je prends soin de mes bijoux ?",
		answer:
			"Évitez le contact avec l'eau, les parfums et les crèmes. Rangez-les à plat dans leur jolie pochette pour éviter les rayures. Avec ces petites attentions, ils resteront beaux pendant longtemps !",
	},
	{
		question: "Vous faites des bijoux sur-mesure ?",
		answer:
			"Oui, j'adore ! Créer une pièce unique pour un cadeau spécial ou une envie particulière, c'est ce que je préfère. Écrivez-moi via la {{link0}} et on discute de votre projet ensemble.",
		links: [{ text: "page Personnalisation", href: "/personnalisation" }],
	},
	{
		question: "C'est quoi le délai pour une création personnalisée ?",
		answer:
			"Comptez environ 2-3 semaines pour une commande sur-mesure. Ce temps me permet de bien comprendre ce que vous souhaitez, de créer des esquisses qu'on validera ensemble, et de réaliser votre bijou avec tout le soin qu'il mérite.",
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
export async function FaqSection() {
	"use cache";
	cacheLife("reference");
	cacheTag("faq-section");

	const accordionItems = faqItems.map((item) => ({
		question: item.question,
		answer: renderAnswerWithLinks(item.answer, item.links),
	}));

	return (
		<section
			className={cn(
				"bg-muted/20 relative overflow-hidden",
				"mask-t-from-95% mask-t-to-100% mask-b-from-95% mask-b-to-100% sm:mask-t-from-90% sm:mask-b-from-90%",
				SECTION_SPACING.section,
			)}
			aria-labelledby="faq-title"
		>
			{/* Skip link for keyboard navigation */}
			<a
				href="#faq-cta-contact"
				className="focus:bg-secondary focus:text-secondary-foreground sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:px-4 focus:py-2 focus:shadow-md"
			>
				Passer au contact
			</a>

			{/* JSON-LD Schema for SEO */}
			<div hidden>
				<script
					id="faq-schema"
					type="application/ld+json"
					dangerouslySetInnerHTML={{
						__html: JSON.stringify(faqSchema).replace(/</g, "\\u003c"),
					}}
				/>
			</div>

			<div className={CONTAINER_CLASS}>
				<header className="mb-10 text-center lg:mb-12">
					<Fade y={MOTION_CONFIG.section.title.y} duration={MOTION_CONFIG.section.title.duration}>
						<SectionTitle id="faq-title">Questions fréquentes</SectionTitle>
						<HandDrawnUnderline color="var(--secondary)" delay={0.15} className="mx-auto mt-2" />
					</Fade>
					<Fade
						y={MOTION_CONFIG.section.subtitle.y}
						delay={MOTION_CONFIG.section.subtitle.delay}
						duration={MOTION_CONFIG.section.subtitle.duration}
					>
						<p className="text-muted-foreground mx-auto mt-4 max-w-xl text-lg/7 tracking-normal antialiased">
							Retrouvez ici les réponses aux questions les plus posées
						</p>
					</Fade>
				</header>

				<div className="relative">
					<FaqDoodles />
					<FaqAccordion items={accordionItems} />
				</div>

				<Fade
					y={MOTION_CONFIG.section.cta.y}
					delay={MOTION_CONFIG.section.cta.delay}
					duration={MOTION_CONFIG.section.cta.duration}
					inView
					once
				>
					<div
						id="faq-cta-contact"
						className="bg-primary/5 border-primary/15 mx-auto mt-12 max-w-3xl rounded-2xl border p-6 text-center sm:p-8"
					>
						<p className="text-muted-foreground mb-1 text-base">
							Vous n'avez pas trouvé votre réponse ?
						</p>
						<p
							className={cn(petitFormalScript.className, "text-foreground/70 mb-5 text-sm italic")}
						>
							Écrivez-moi, je réponds toujours !
						</p>
						<Button
							asChild
							variant="outline"
							size="lg"
							className="gap-2 transition-all duration-300 ease-out hover:scale-[1.02] hover:shadow-md active:scale-[0.98]"
						>
							<a href={`mailto:${BRAND.contact.email}`}>
								<MessageCircle className="h-4 w-4" aria-hidden="true" />
								Me contacter
							</a>
						</Button>
					</div>
				</Fade>
			</div>
		</section>
	);
}
