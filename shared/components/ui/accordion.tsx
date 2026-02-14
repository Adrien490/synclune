"use client";

import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDownIcon } from "lucide-react";
import * as React from "react";

import { cn } from "@/shared/utils/cn";

function Accordion({
	...props
}: React.ComponentProps<typeof AccordionPrimitive.Root>) {
	return <AccordionPrimitive.Root data-slot="accordion" {...props} />;
}

function AccordionItem({
	className,
	...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>) {
	return (
		<AccordionPrimitive.Item
			data-slot="accordion-item"
			className={cn("border-b last:border-b-0", className)}
			{...props}
		/>
	);
}

interface AccordionTriggerProps
	extends React.ComponentProps<typeof AccordionPrimitive.Trigger> {
	headingLevel?: 2 | 3 | 4 | 5 | 6;
}

function AccordionTrigger({
	className,
	children,
	headingLevel,
	...props
}: AccordionTriggerProps) {
	const HeadingTag = headingLevel
		? (`h${headingLevel}` as "h2" | "h3" | "h4" | "h5" | "h6")
		: null;

	const triggerContent = (
		<AccordionPrimitive.Trigger
			data-slot="accordion-trigger"
			className={cn(
				"focus-visible:border-ring focus-visible:ring-ring/50 flex flex-1 items-center justify-between gap-4 rounded-md py-4 min-h-11 text-left text-sm font-medium outline-none hover:underline active:bg-muted/50 focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 [&[data-state=open]>svg]:rotate-180",
				className
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

	return (
		<AccordionPrimitive.Header className="flex" asChild={!!HeadingTag}>
			{HeadingTag ? (
				<HeadingTag className="m-0 font-normal">{triggerContent}</HeadingTag>
			) : (
				triggerContent
			)}
		</AccordionPrimitive.Header>
	);
}

function AccordionContent({
	className,
	children,
	...props
}: React.ComponentProps<typeof AccordionPrimitive.Content>) {
	return (
		<AccordionPrimitive.Content
			data-slot="accordion-content"
			forceMount
			className="grid text-sm motion-safe:[transition:grid-template-rows_280ms_cubic-bezier(0.25,0.1,0.25,1)] data-[state=closed]:grid-rows-[0fr] data-[state=open]:grid-rows-[1fr]"
			{...props}
		>
			<div className="overflow-hidden min-h-0">
				<div className={cn("px-3 pt-2 pb-4", className)}>{children}</div>
			</div>
		</AccordionPrimitive.Content>
	);
}

export { Accordion, AccordionContent, AccordionItem, AccordionTrigger };
