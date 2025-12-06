"use client"

import { Button } from "@/shared/components/ui/button"
import { TESTIMONIAL_DIALOG_ID } from "./testimonial-form-dialog"
import { useDialog } from "@/shared/providers/dialog-store-provider"

export function CreateTestimonialButton() {
	const { open } = useDialog(TESTIMONIAL_DIALOG_ID)

	return <Button onClick={() => open()}>Créer un témoignage</Button>
}
