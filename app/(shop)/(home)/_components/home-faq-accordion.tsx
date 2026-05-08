"use client";

import type { ReactNode } from "react";

import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/shared/components/ui/accordion";
import { useHaptic } from "@/shared/hooks/use-haptic";

export interface HomeFaqAccordionItem {
	id: string;
	question: string;
	answer: ReactNode;
}

interface HomeFaqAccordionProps {
	items: ReadonlyArray<HomeFaqAccordionItem>;
}

export function HomeFaqAccordion({ items }: HomeFaqAccordionProps) {
	const haptic = useHaptic();

	return (
		<Accordion
			type="single"
			collapsible
			className="mx-auto max-w-3xl"
			aria-label="Liste des questions fréquentes"
			onValueChange={(value) => {
				if (value) haptic("selection");
			}}
		>
			{items.map((item) => (
				<AccordionItem key={item.id} value={item.id} className="scroll-mt-24 lg:scroll-mt-28">
					<AccordionTrigger
						headingLevel={3}
						className="text-base data-[state=open]:font-medium sm:text-lg"
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
