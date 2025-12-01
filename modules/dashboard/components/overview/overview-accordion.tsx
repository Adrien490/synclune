"use client"

import { Accordion } from "@/shared/components/ui/accordion"
import { usePersistedState } from "../../hooks/use-persisted-state"
import {
	DEFAULT_OPEN_SECTIONS,
	OVERVIEW_SECTIONS_STORAGE_KEY,
	type OverviewSectionId,
} from "../../constants/overview-sections"

interface OverviewAccordionProps {
	children: React.ReactNode
}

/**
 * Wrapper Accordion pour les sections Overview
 * Gere la persistence des sections ouvertes/fermees dans localStorage
 */
export function OverviewAccordion({ children }: OverviewAccordionProps) {
	const [openSections, setOpenSections] = usePersistedState<OverviewSectionId[]>(
		OVERVIEW_SECTIONS_STORAGE_KEY,
		DEFAULT_OPEN_SECTIONS
	)

	return (
		<Accordion
			type="multiple"
			value={openSections}
			onValueChange={(value) => setOpenSections(value as OverviewSectionId[])}
			className="space-y-4"
		>
			{children}
		</Accordion>
	)
}
