import { Fade, HandDrawnUnderline } from "@/shared/components/animations";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { SectionTitle } from "@/shared/components/section-title";
import { Button } from "@/shared/components/ui/button";
import { BRAND } from "@/shared/constants/brand";
import { CONTAINER_CLASS, SECTION_SPACING } from "@/shared/constants/spacing";
import { cn } from "@/shared/utils/cn";
import { MessageCircle } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { FaqAccordion } from "./faq-accordion";
import { FaqDoodles } from "./faq-doodles";
import type { FaqItemData } from "../utils/faq-display";
import { generateFaqSchema, parseAnswerSegments } from "../utils/faq-display";
import { safeJsonLd } from "@/shared/utils/safe-json-ld";
import { getFaqItems } from "../data/get-faq-items";

function renderSegments(segments: ReturnType<typeof parseAnswerSegments>): ReactNode {
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
						key={`segment-${i}`}
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

/**
 * FAQ section with FAQPage JSON-LD schema for rich snippets.
 *
 * Server Component with client island for the Accordion.
 * FAQ items are fetched from the database (managed via admin).
 */
export async function FaqSection() {
	const faqItems = await getFaqItems();

	if (faqItems.length === 0) return null;

	const faqItemsData: FaqItemData[] = faqItems.map((item) => ({
		question: item.question,
		answer: item.answer,
		links: item.links ?? undefined,
	}));

	const faqSchema = generateFaqSchema(faqItemsData);

	const accordionItems = faqItemsData.map((item) => ({
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
			<script
				id="faq-schema"
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: safeJsonLd(faqSchema),
				}}
			/>

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
						<p className="text-muted-foreground mb-5 text-base">
							Vous n'avez pas trouvé votre réponse ?
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
