"use client";

import { Stagger } from "@/shared/components/animations";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/shared/components/ui/accordion";
import type { ReactNode } from "react";

interface FaqItem {
	question: string;
	answer: ReactNode;
}

interface FaqAccordionProps {
	items: FaqItem[];
}

export function FaqAccordion({ items }: FaqAccordionProps) {
	return (
		<Accordion type="multiple" className="max-w-3xl mx-auto">
			<Stagger stagger={0.06} y={20} once className="space-y-3">
				{items.map((item, idx) => (
					<AccordionItem
						key={idx}
						value={`faq-${idx}`}
						className="bg-muted/30 rounded-xl px-5 border shadow-sm"
					>
						<AccordionTrigger
							className="text-base font-medium text-left py-5"
							headingLevel={3}
						>
							{item.question}
						</AccordionTrigger>
						<AccordionContent className="text-muted-foreground text-base/7 pb-5">
							{item.answer}
						</AccordionContent>
					</AccordionItem>
				))}
			</Stagger>
		</Accordion>
	);
}
