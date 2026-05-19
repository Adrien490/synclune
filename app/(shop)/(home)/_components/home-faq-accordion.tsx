"use client";

import type { ReactNode } from "react";

import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/shared/components/ui/accordion";

interface HomeFaqAccordionItem {
	id: string;
	question: string;
	answer: ReactNode;
}

interface HomeFaqAccordionProps {
	items: ReadonlyArray<HomeFaqAccordionItem>;
}

// Matches the 280ms grid-rows transition in AccordionContent — scroll once expanded
const EXPAND_ANIMATION_MS = 320;

export function HomeFaqAccordion({ items }: HomeFaqAccordionProps) {
	return (
		<Accordion
			type="single"
			collapsible
			className="mx-auto max-w-3xl"
			aria-label="Liste des questions fréquentes"
			onValueChange={(value) => {
				if (!value) return;
				const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
				window.setTimeout(() => {
					document.getElementById(value)?.scrollIntoView({
						behavior: prefersReducedMotion ? "auto" : "smooth",
						block: "nearest",
					});
				}, EXPAND_ANIMATION_MS);
			}}
		>
			{items.map((item) => (
				<AccordionItem
					key={item.id}
					id={item.id}
					value={item.id}
					className="data-[state=open]:bg-primary/5 scroll-mt-24 transition-colors lg:scroll-mt-28"
				>
					<AccordionTrigger
						headingLevel={3}
						className="data-[state=open]:[&_svg]:text-primary text-base data-[state=open]:font-medium sm:text-lg"
					>
						{item.question}
					</AccordionTrigger>
					<AccordionContent className="text-muted-foreground text-base leading-relaxed">
						{item.answer}
					</AccordionContent>
				</AccordionItem>
			))}
		</Accordion>
	);
}
