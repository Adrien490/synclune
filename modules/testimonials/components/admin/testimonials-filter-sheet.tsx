"use client"

import { FilterSheetWrapper } from "@/shared/components/filter-sheet"
import { useAppForm } from "@/shared/components/tanstack-form"
import { Label } from "@/shared/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/shared/components/ui/radio-group"
import { useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"

interface FilterFormData {
	isPublished: string
}

/**
 * Panel de filtres avancés pour les témoignages
 * Accessible via le bouton "Filtres" dans la toolbar
 */
export function TestimonialsFilterSheet() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const [isPending, startTransition] = useTransition()

	const initialValues = ((): FilterFormData => {
		const isPublished = searchParams.get("isPublished")
		return {
			isPublished:
				isPublished === "true"
					? "published"
					: isPublished === "false"
						? "draft"
						: "all",
		}
	})()

	const form = useAppForm({
		defaultValues: initialValues,
		onSubmit: async ({ value }: { value: FilterFormData }) => {
			const params = new URLSearchParams(searchParams.toString())
			params.delete("isPublished")
			params.set("page", "1")

			if (value.isPublished !== "all") {
				params.set(
					"isPublished",
					value.isPublished === "published" ? "true" : "false"
				)
			}

			startTransition(() => {
				router.push(`?${params.toString()}`, { scroll: false })
			})
		},
	})

	const clearAllFilters = () => {
		form.reset({ isPublished: "all" })

		const params = new URLSearchParams(searchParams.toString())
		params.delete("isPublished")
		params.set("page", "1")

		startTransition(() => {
			router.push(`?${params.toString()}`, { scroll: false })
		})
	}

	const { hasActiveFilters, activeFiltersCount } = (() => {
		let count = 0
		if (searchParams.has("isPublished")) count++
		return { hasActiveFilters: count > 0, activeFiltersCount: count }
	})()

	return (
		<FilterSheetWrapper
			activeFiltersCount={activeFiltersCount}
			hasActiveFilters={hasActiveFilters}
			onClearAll={clearAllFilters}
			onApply={() => form.handleSubmit()}
			isPending={isPending}
		>
			<form
				onSubmit={() => {
					form.handleSubmit()
				}}
				className="space-y-6"
			>
				<form.Field name="isPublished">
					{(field) => (
						<div className="space-y-3">
							<Label className="font-medium text-sm text-foreground">
								Statut de publication
							</Label>
							<RadioGroup
								value={field.state.value}
								onValueChange={field.handleChange}
							>
								{[
									{ value: "all", label: "Tous" },
									{ value: "published", label: "Publiés" },
									{ value: "draft", label: "Brouillons" },
								].map(({ value, label }) => (
									<div key={value} className="flex items-center space-x-2">
										<RadioGroupItem value={value} id={`status-${value}`} />
										<Label
											htmlFor={`status-${value}`}
											className="text-sm font-normal cursor-pointer"
										>
											{label}
										</Label>
									</div>
								))}
							</RadioGroup>
						</div>
					)}
				</form.Field>
			</form>
		</FilterSheetWrapper>
	)
}
