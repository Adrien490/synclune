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
		<Accordion type="single" collapsible className="max-w-3xl mx-auto">
			<Stagger stagger={0.06} y={20} inView once className="space-y-3">
				{items.map((item, idx) => (
					<AccordionItem
						key={idx}
						value={`faq-${idx}`}
						className="bg-muted/30 rounded-xl px-5 border shadow-sm motion-safe:transition-all motion-safe:duration-300 can-hover:hover:bg-muted/50 can-hover:hover:shadow-md can-hover:hover:-translate-y-0.5 active:scale-[0.99] data-[state=open]:border-l-2 data-[state=open]:border-l-primary/50 data-[state=open]:bg-muted/50 data-[state=open]:shadow-md"
					>
						<AccordionTrigger
							className="text-base font-medium text-left py-5 gap-3 hover:no-underline [&[data-state=open]>svg]:text-primary"
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
