import { Stagger } from "@/shared/components/animations";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
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
		<Accordion type="single" collapsible className="mx-auto max-w-3xl">
			<Stagger stagger={MOTION_CONFIG.stagger.normal} y={20} inView once className="space-y-3">
				{items.map((item, idx) => (
					<AccordionItem
						key={`faq-${idx}`}
						value={`faq-${idx}`}
						className="bg-muted/30 can-hover:hover:bg-muted/50 can-hover:hover:shadow-md can-hover:hover:-translate-y-0.5 data-[state=open]:border-l-primary/50 data-[state=open]:bg-muted/50 rounded-xl border px-5 shadow-sm active:scale-[0.99] data-[state=open]:border-l-2 data-[state=open]:shadow-md motion-safe:transition-all motion-safe:duration-300"
					>
						<AccordionTrigger
							className="[&[data-state=open]>svg]:text-primary gap-3 py-5 text-left text-base font-medium hover:no-underline"
							headingLevel={3}
						>
							{item.question}
						</AccordionTrigger>
						<AccordionContent className="text-muted-foreground pb-5 text-base/7">
							{item.answer}
						</AccordionContent>
					</AccordionItem>
				))}
			</Stagger>
		</Accordion>
	);
}
