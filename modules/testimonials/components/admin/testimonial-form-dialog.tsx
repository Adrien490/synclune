"use client"

import { Button } from "@/shared/components/ui/button"
import {
	ResponsiveDialog,
	ResponsiveDialogContent,
	ResponsiveDialogHeader,
	ResponsiveDialogTitle,
} from "@/shared/components/ui/responsive-dialog"
import { RequiredFieldsNote } from "@/shared/components/ui/required-fields-note"
import { useAppForm } from "@/shared/components/tanstack-form"
import { createTestimonial } from "@/modules/testimonials/actions/create-testimonial"
import { updateTestimonial } from "@/modules/testimonials/actions/update-testimonial"
import { createTestimonialSchema } from "@/modules/testimonials/schemas/testimonial.schemas"
import { useDialog } from "@/shared/providers/dialog-store-provider"
import { useEffect, useActionState } from "react"
import { withCallbacks } from "@/shared/utils/with-callbacks"
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks"
import { Checkbox } from "@/shared/components/ui/checkbox"
import { Label } from "@/shared/components/ui/label"

export const TESTIMONIAL_DIALOG_ID = "testimonial-form"

/**
 * Validators dérivés du schema Zod pour garder la synchronisation
 * entre la validation côté client et côté serveur
 */
const validators = {
	authorName: ({ value }: { value: string }) => {
		const result = createTestimonialSchema.shape.authorName.safeParse(value)
		return result.success ? undefined : result.error.issues[0]?.message
	},
	content: ({ value }: { value: string }) => {
		const result = createTestimonialSchema.shape.content.safeParse(value)
		return result.success ? undefined : result.error.issues[0]?.message
	},
	imageUrl: ({ value }: { value: string }) => {
		if (!value) return undefined // Optional field
		const result = createTestimonialSchema.shape.imageUrl.safeParse(value)
		return result.success ? undefined : result.error.issues[0]?.message
	},
}

interface TestimonialDialogData extends Record<string, unknown> {
	testimonial?: {
		id: string
		authorName: string
		content: string
		imageUrl: string | null
		isPublished: boolean
	}
}

export function TestimonialFormDialog() {
	const { isOpen, close, data } =
		useDialog<TestimonialDialogData>(TESTIMONIAL_DIALOG_ID)
	const testimonial = data?.testimonial
	const isUpdateMode = !!testimonial

	const form = useAppForm({
		defaultValues: {
			authorName: "",
			content: "",
			imageUrl: "",
			isPublished: false,
		},
	})

	// Create action
	const [, createAction, isCreatePending] = useActionState(
		withCallbacks(
			createTestimonial,
			createToastCallbacks({
				onSuccess: () => {
					close()
					form.reset()
				},
			})
		),
		undefined
	)

	// Update action
	const [, updateAction, isUpdatePending] = useActionState(
		withCallbacks(
			updateTestimonial,
			createToastCallbacks({
				onSuccess: () => {
					close()
				},
			})
		),
		undefined
	)

	const isPending = isCreatePending || isUpdatePending
	const action = isUpdateMode ? updateAction : createAction

	// Reset form values when testimonial data changes
	useEffect(() => {
		if (testimonial) {
			form.reset({
				authorName: testimonial.authorName,
				content: testimonial.content,
				imageUrl: testimonial.imageUrl || "",
				isPublished: testimonial.isPublished,
			})
		} else {
			form.reset({
				authorName: "",
				content: "",
				imageUrl: "",
				isPublished: false,
			})
		}
	}, [testimonial, form])

	return (
		<ResponsiveDialog
			open={isOpen}
			onOpenChange={(open) => {
				if (!open && !isPending) {
					close()
				}
			}}
		>
			<ResponsiveDialogContent className="max-w-2xl">
				<ResponsiveDialogHeader>
					<ResponsiveDialogTitle>
						{isUpdateMode ? "Modifier le témoignage" : "Créer un témoignage"}
					</ResponsiveDialogTitle>
				</ResponsiveDialogHeader>

				<form
					action={action}
					className="space-y-6"
					onSubmit={() => form.handleSubmit()}
				>
					{isUpdateMode && testimonial && (
						<input type="hidden" name="id" value={testimonial.id} />
					)}

					<RequiredFieldsNote />

					<div className="space-y-4">
						<form.AppField
							name="authorName"
							validators={{ onChange: validators.authorName }}
						>
							{(field) => (
								<field.InputField
									label="Prénom"
									type="text"
									placeholder="ex: Marie"
									disabled={isPending}
									required
								/>
							)}
						</form.AppField>

						<form.AppField
							name="content"
							validators={{ onChange: validators.content }}
						>
							{(field) => (
								<field.TextareaField
									label="Témoignage"
									placeholder="Saisissez le témoignage du client..."
									disabled={isPending}
									required
									rows={5}
								/>
							)}
						</form.AppField>

						<form.AppField
							name="imageUrl"
							validators={{ onChange: validators.imageUrl }}
						>
							{(field) => (
								<field.InputField
									label="URL de l'image"
									type="url"
									placeholder="https://..."
									disabled={isPending}
								/>
							)}
						</form.AppField>

						<form.AppField name="isPublished">
							{(field) => (
								<div className="flex items-center space-x-2">
									<Checkbox
										id="isPublished"
										name="isPublished"
										checked={field.state.value}
										onCheckedChange={(checked) =>
											field.handleChange(checked === true)
										}
										disabled={isPending}
									/>
									<input
										type="hidden"
										name="isPublished"
										value={field.state.value ? "true" : "false"}
									/>
									<Label htmlFor="isPublished" className="cursor-pointer">
										Publier immédiatement
									</Label>
								</div>
							)}
						</form.AppField>
					</div>

					{/* Submit button */}
					<div className="flex justify-end pt-4">
						<form.Subscribe selector={(state) => [state.canSubmit]}>
							{([canSubmit]) => (
								<Button disabled={!canSubmit || isPending} type="submit">
									{isPending
										? "Enregistrement..."
										: isUpdateMode
											? "Enregistrer"
											: "Créer"}
								</Button>
							)}
						</form.Subscribe>
					</div>
				</form>
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	)
}
