"use client"

import { useSelectionContext } from "@/shared/contexts/selection-context"
import { Checkbox } from "@/shared/components/ui/checkbox"

interface TestimonialsCardSelectionProps {
	testimonialId: string
	authorName: string
}

/**
 * Checkbox de sélection pour une carte de témoignage
 * Utilise le contexte de sélection partagé
 */
export function TestimonialsCardSelection({
	testimonialId,
	authorName,
}: TestimonialsCardSelectionProps) {
	const { isSelected, handleItemSelectionChange } = useSelectionContext()
	const checked = isSelected(testimonialId)

	return (
		<Checkbox
			checked={checked}
			onCheckedChange={(checked) => {
				handleItemSelectionChange(testimonialId, checked === true)
			}}
			aria-label={`Sélectionner le témoignage de ${authorName}`}
			className="absolute top-3 left-3 z-10 bg-background border-2"
		/>
	)
}
