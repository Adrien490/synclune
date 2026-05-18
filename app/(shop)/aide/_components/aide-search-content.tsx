"use client";

import { Search, SearchX } from "lucide-react";
import { useState } from "react";

import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/shared/components/ui/accordion";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/shared/components/ui/empty";
import { Input } from "@/shared/components/ui/input";
import { FAQ_SECTIONS, type FaqItem, type FaqSection } from "@/shared/constants/faq-items";

interface AideSearchContentProps {
	items: ReadonlyArray<FaqItem>;
}

function normalize(value: string): string {
	return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function AideSearchContent({ items }: AideSearchContentProps) {
	const [query, setQuery] = useState("");

	const trimmed = query.trim();
	const normalizedQuery = normalize(trimmed);
	const filtered = trimmed
		? items.filter((item) => {
				const haystack = normalize(`${item.question} ${item.answerText}`);
				return haystack.includes(normalizedQuery);
			})
		: items;

	const sections = Object.keys(FAQ_SECTIONS) as FaqSection[];

	return (
		<div className="mx-auto max-w-3xl space-y-8">
			<div className="relative">
				<Search
					className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
					aria-hidden="true"
				/>
				<Input
					type="search"
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					placeholder="Rechercher dans l'aide…"
					aria-label="Rechercher dans la FAQ"
					className="pl-9"
				/>
				<span className="sr-only" role="status" aria-live="polite">
					{trimmed
						? `${filtered.length} question${filtered.length > 1 ? "s" : ""} trouvée${filtered.length > 1 ? "s" : ""}`
						: ""}
				</span>
			</div>

			{filtered.length === 0 ? (
				<Empty>
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<SearchX className="size-6" aria-hidden="true" />
						</EmptyMedia>
						<EmptyTitle>Aucune réponse pour « {trimmed} »</EmptyTitle>
						<EmptyDescription>
							Essayez d&apos;autres mots-clés ou écrivez-moi directement, je vous réponds sous 48 h.
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			) : trimmed ? (
				<Accordion type="single" collapsible className="w-full">
					{filtered.map((item) => (
						<AccordionItem key={item.id} value={item.id} className="scroll-mt-24">
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
			) : (
				<div className="space-y-10">
					{sections.map((sectionKey) => {
						const sectionItems = filtered.filter((item) => item.section === sectionKey);
						if (sectionItems.length === 0) return null;
						return (
							<section key={sectionKey} aria-labelledby={`aide-section-${sectionKey}`}>
								<h2
									id={`aide-section-${sectionKey}`}
									className="font-display text-foreground mb-3 text-xl font-normal"
								>
									{FAQ_SECTIONS[sectionKey]}
								</h2>
								<Accordion type="single" collapsible className="w-full">
									{sectionItems.map((item) => (
										<AccordionItem key={item.id} value={item.id} className="scroll-mt-24">
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
							</section>
						);
					})}
				</div>
			)}
		</div>
	);
}
