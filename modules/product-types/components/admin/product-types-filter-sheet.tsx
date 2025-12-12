"use client";

import { FilterSheetWrapper } from "@/shared/components/filter-sheet";
import { RadioFilterItem } from "@/shared/components/forms/radio-filter-item";
import { useForm } from "@tanstack/react-form";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

interface ProductTypesFilterSheetProps {
	className?: string;
}

interface FilterFormData {
	isActive: string;
}

export function ProductTypesFilterSheet({
	className,
}: ProductTypesFilterSheetProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();

	const initialValues = ((): FilterFormData => {
		let isActive = "all";

		searchParams.forEach((value, key) => {
			if (key === "filter_isActive") {
				isActive = value === "true" ? "active" : "inactive";
			}
		});

		return {
			isActive,
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

		params.delete("filter_isActive");
		params.set("page", "1");

		// Add isActive filter
		if (formData.isActive !== "all") {
			params.set(
				"filter_isActive",
				formData.isActive === "active" ? "true" : "false"
			);
		}

		startTransition(() => {
			router.push(`?${params.toString()}`, { scroll: false });
		});
	};

	const clearAllFilters = () => {
		form.reset({
			isActive: "all",
		});

		const params = new URLSearchParams(searchParams.toString());
		params.delete("filter_isActive");
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
				{/* isActive Filter */}
				<form.Field name="isActive">
					{(field) => (
						<fieldset className="space-y-1">
							<legend className="font-medium text-sm text-foreground mb-2">
								Statut actif
							</legend>
							{[
								{ value: "all", label: "Tous" },
								{ value: "active", label: "Actif uniquement" },
								{ value: "inactive", label: "Inactif uniquement" },
							].map(({ value, label }) => (
								<RadioFilterItem
									key={value}
									id={`active-${value}`}
									name="isActive"
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
