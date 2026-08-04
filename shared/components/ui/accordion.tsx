"use client";

import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion";
import { ChevronDownIcon } from "lucide-react";

import { cn } from "@/shared/utils/cn";

function Accordion({ ...props }: AccordionPrimitive.Root.Props) {
	return <AccordionPrimitive.Root data-slot="accordion" {...props} />;
}

function AccordionItem({ className, ...props }: AccordionPrimitive.Item.Props) {
	return (
		<AccordionPrimitive.Item
			data-slot="accordion-item"
			className={cn("border-b last:border-b-0", className)}
			{...props}
		/>
	);
}

interface AccordionTriggerProps extends AccordionPrimitive.Trigger.Props {
	headingLevel?: 2 | 3 | 4 | 5 | 6;
}

function AccordionTrigger({ className, children, headingLevel, ...props }: AccordionTriggerProps) {
	const HeadingTag = headingLevel ? (`h${headingLevel}` as "h2" | "h3" | "h4" | "h5" | "h6") : null;

	const triggerContent = (
		<AccordionPrimitive.Trigger
			data-slot="accordion-trigger"
			className={cn(
				// Base UI marque le trigger d'un panneau ouvert avec `data-panel-open`
				// (et non `data-state="open"` comme Radix).
				"focus-ring active:bg-muted/50 can-hover:hover:underline flex min-h-11 flex-1 items-center justify-between gap-4 rounded-md py-4 text-left text-sm font-medium disabled:pointer-events-none disabled:opacity-50 [&[data-panel-open]>svg]:rotate-180",
				className,
			)}
			{...props}
		>
			{children}
			<ChevronDownIcon
				className="text-muted-foreground pointer-events-none size-4 shrink-0 transition-transform duration-200"
				aria-hidden="true"
			/>
		</AccordionPrimitive.Trigger>
	);

	return HeadingTag ? (
		<AccordionPrimitive.Header className="flex" render={<HeadingTag className="m-0 font-normal" />}>
			{triggerContent}
		</AccordionPrimitive.Header>
	) : (
		<AccordionPrimitive.Header className="flex">{triggerContent}</AccordionPrimitive.Header>
	);
}

function AccordionContent({ className, children, ...props }: AccordionPrimitive.Panel.Props) {
	return (
		<AccordionPrimitive.Panel
			data-slot="accordion-content"
			keepMounted
			className="grid text-sm data-closed:grid-rows-[0fr] data-open:grid-rows-[1fr] motion-safe:[transition:grid-template-rows_280ms_var(--ease-premium)]"
			{...props}
		>
			<div className="min-h-0 overflow-hidden">
				<div className={cn("px-3 pt-2 pb-4", className)}>{children}</div>
			</div>
		</AccordionPrimitive.Panel>
	);
}

export { Accordion, AccordionContent, AccordionItem, AccordionTrigger };
