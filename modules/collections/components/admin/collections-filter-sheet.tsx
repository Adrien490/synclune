"use client";

import { FilterSheetWrapper } from "@/shared/components/filter-sheet-wrapper";
import { RadioFilterItem } from "@/shared/components/forms/radio-filter-item";
import { useForm } from "@tanstack/react-form";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

interface CollectionsFilterSheetProps {
	className?: string;
}

interface FilterFormData {
	hasProducts: string;
}

export function CollectionsFilterSheet({
	className,
}: CollectionsFilterSheetProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();

	const initialValues = ((): FilterFormData => {
		let hasProducts = "all";

		searchParams.forEach((value, key) => {
			if (key === "filter_hasProducts") {
				hasProducts = value === "true" ? "with" : "without";
			}
		});

		return {
			hasProducts,
		};
	})();

	const form = useForm({
		defaultValues: initialValues,
		onSubmit: async ({ value }: { value: FilterFormData }) => {
			applyFilters(value);
		},
	});

	const applyFilters = (formData: FilterFormData) => {
		const params = new URLSearchParams(searchParams.toString());

		const filterKeys = ["filter_hasProducts"];
		filterKeys.forEach((key) => params.delete(key));
		params.set("page", "1");

		// Add hasProducts filter
		if (formData.hasProducts !== "all") {
			params.set(
				"filter_hasProducts",
				formData.hasProducts === "with" ? "true" : "false"
			);
		}

		startTransition(() => {
			router.push(`?${params.toString()}`, { scroll: false });
		});
	};

	const clearAllFilters = () => {
		form.reset({
			hasProducts: "all",
		});

		const params = new URLSearchParams(searchParams.toString());
		const filterKeys = ["filter_hasProducts"];
		filterKeys.forEach((key) => params.delete(key));
		params.set("page", "1");

		startTransition(() => {
			router.push(`?${params.toString()}`, { scroll: false });
		});
	};

	const { hasActiveFilters, activeFiltersCount } = (() => {
		let count = 0;
		searchParams.forEach((value, key) => {
			if (["page", "perPage", "sortBy", "search"].includes(key)) return;
			if (key.startsWith("filter_")) count += 1;
		});
		return { hasActiveFilters: count > 0, activeFiltersCount: count };
	})();

	return (
		<FilterSheetWrapper
			activeFiltersCount={activeFiltersCount}
			hasActiveFilters={hasActiveFilters}
			onClearAll={clearAllFilters}
			onApply={() => form.handleSubmit()}
			isPending={isPending}
			triggerClassName={className}
		>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					form.handleSubmit();
				}}
				className="space-y-6"
			>
				{/* hasProducts Filter */}
				<form.Field name="hasProducts">
					{(field) => (
						<fieldset className="space-y-1">
							<legend className="font-medium text-sm text-foreground mb-2">
								Bijoux
							</legend>
							{[
								{ value: "all", label: "Tous" },
								{ value: "with", label: "Avec bijoux" },
								{ value: "without", label: "Sans bijoux" },
							].map(({ value, label }) => (
								<RadioFilterItem
									key={value}
									id={`products-${value}`}
									name="hasProducts"
									value={value}
									checked={field.state.value === value}
									onCheckedChange={(checked) => {
										if (checked) {
											field.handleChange(value);
										}
									}}
								>
									{label}
								</RadioFilterItem>
							))}
						</fieldset>
					)}
				</form.Field>
			</form>
		</FilterSheetWrapper>
	);
}
