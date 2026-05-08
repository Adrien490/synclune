"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import { FilterSheetWrapper } from "@/shared/components/filter-sheet-wrapper";
import { CheckboxFilterItem } from "@/shared/components/forms/checkbox-filter-item";
import { useAppForm } from "@/shared/components/forms";
import { Separator } from "@/shared/components/ui/separator";

import { REVIEW_STATUS_LABELS } from "../../constants/review.constants";

interface ReviewsFilterSheetProps {
	className?: string;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	hideTrigger?: boolean;
}

interface FilterFormData {
	status: string;
	rating: string;
	hasResponse: string;
}

const RATING_OPTIONS = [5, 4, 3, 2, 1] as const;

export function ReviewsFilterSheet({
	className,
	open: controlledOpen,
	onOpenChange: controlledOnOpenChange,
	hideTrigger,
}: ReviewsFilterSheetProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();

	const [internalOpen, setInternalOpen] = useState(false);
	const isOpen = controlledOpen ?? internalOpen;
	const handleOpenChange = controlledOnOpenChange ?? setInternalOpen;

	const initialValues: FilterFormData = {
		status: searchParams.get("status") ?? "",
		rating: searchParams.get("rating") ?? "",
		hasResponse: searchParams.get("hasResponse") ?? "",
	};

	const form = useAppForm({
		defaultValues: initialValues,
		onSubmit: async ({ value }: { value: FilterFormData }) => {
			applyFilters(value);
		},
	});

	const applyFilters = (formData: FilterFormData) => {
		const params = new URLSearchParams(searchParams.toString());

		["status", "rating", "hasResponse"].forEach((key) => params.delete(key));
		params.delete("cursor");
		params.delete("direction");

		if (formData.status) params.set("status", formData.status);
		if (formData.rating) params.set("rating", formData.rating);
		if (formData.hasResponse) params.set("hasResponse", formData.hasResponse);

		startTransition(() => {
			router.push(`?${params.toString()}`, { scroll: false });
		});
	};

	const clearAllFilters = () => {
		form.reset({ status: "", rating: "", hasResponse: "" });

		const params = new URLSearchParams(searchParams.toString());
		["status", "rating", "hasResponse"].forEach((key) => params.delete(key));
		params.delete("cursor");
		params.delete("direction");

		startTransition(() => {
			router.push(`?${params.toString()}`, { scroll: false });
		});
	};

	const { hasActiveFilters, activeFiltersCount } = (() => {
		let count = 0;
		if (searchParams.has("status")) count++;
		if (searchParams.has("rating")) count++;
		if (searchParams.has("hasResponse")) count++;
		return { hasActiveFilters: count > 0, activeFiltersCount: count };
	})();

	return (
		<FilterSheetWrapper
			open={isOpen}
			onOpenChange={handleOpenChange}
			hideTrigger={hideTrigger}
			activeFiltersCount={activeFiltersCount}
			hasActiveFilters={hasActiveFilters}
			onClearAll={clearAllFilters}
			onApply={() => void form.handleSubmit()}
			isPending={isPending}
			triggerClassName={className}
			title="Filtres"
			description="Affinez la liste des avis"
		>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					void form.handleSubmit();
				}}
				className="space-y-6"
			>
				<form.Field name="status">
					{(field) => (
						<fieldset className="space-y-1">
							<legend className="text-foreground mb-2 text-sm font-medium">Statut</legend>
							{Object.entries(REVIEW_STATUS_LABELS).map(([value, label]) => (
								<CheckboxFilterItem
									key={value}
									id={`review-status-${value}`}
									checked={field.state.value === value}
									onCheckedChange={(checked) => {
										field.handleChange(checked ? value : "");
									}}
								>
									{label}
								</CheckboxFilterItem>
							))}
						</fieldset>
					)}
				</form.Field>

				<Separator />

				<form.Field name="rating">
					{(field) => (
						<fieldset className="space-y-1">
							<legend className="text-foreground mb-2 text-sm font-medium">Note</legend>
							{RATING_OPTIONS.map((value) => (
								<CheckboxFilterItem
									key={value}
									id={`review-rating-${value}`}
									checked={field.state.value === String(value)}
									onCheckedChange={(checked) => {
										field.handleChange(checked ? String(value) : "");
									}}
								>
									{value} étoile{value > 1 ? "s" : ""}
								</CheckboxFilterItem>
							))}
						</fieldset>
					)}
				</form.Field>

				<Separator />

				<form.Field name="hasResponse">
					{(field) => (
						<fieldset className="space-y-1">
							<legend className="text-foreground mb-2 text-sm font-medium">Réponse</legend>
							<CheckboxFilterItem
								id="review-hasresponse-true"
								checked={field.state.value === "true"}
								onCheckedChange={(checked) => {
									field.handleChange(checked ? "true" : "");
								}}
							>
								Avec réponse
							</CheckboxFilterItem>
							<CheckboxFilterItem
								id="review-hasresponse-false"
								checked={field.state.value === "false"}
								onCheckedChange={(checked) => {
									field.handleChange(checked ? "false" : "");
								}}
							>
								Sans réponse
							</CheckboxFilterItem>
						</fieldset>
					)}
				</form.Field>
			</form>
		</FilterSheetWrapper>
	);
}
