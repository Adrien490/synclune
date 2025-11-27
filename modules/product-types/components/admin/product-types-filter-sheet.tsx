"use client";

import { FilterSheetWrapper } from "@/shared/components/filter-sheet";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Label } from "@/shared/components/ui/label";
import { useForm } from "@tanstack/react-form";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useTransition } from "react";

interface ProductTypesFilterSheetProps {
	className?: string;
}

interface FilterFormData {
	isActive: string;
	hasSize: string;
}

export function ProductTypesFilterSheet({
	className,
}: ProductTypesFilterSheetProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();

	const initialValues = useMemo((): FilterFormData => {
		let isActive = "all";
		let hasSize = "all";

		searchParams.forEach((value, key) => {
			if (key === "filter_isActive") {
				isActive = value === "true" ? "active" : "inactive";
			} else if (key === "filter_hasSize") {
				hasSize = value === "true" ? "with" : "without";
			}
		});

		return {
			isActive,
			hasSize,
		};
	}, [searchParams]);

	const form = useForm({
		defaultValues: initialValues,
		onSubmit: async ({ value }: { value: FilterFormData }) => {
			applyFilters(value);
		},
	});

	const applyFilters = (formData: FilterFormData) => {
		const params = new URLSearchParams(searchParams.toString());

		const filterKeys = ["filter_isActive", "filter_hasSize"];
		filterKeys.forEach((key) => params.delete(key));
		params.set("page", "1");

		// Add isActive filter
		if (formData.isActive !== "all") {
			params.set(
				"filter_isActive",
				formData.isActive === "active" ? "true" : "false"
			);
		}

		// Add hasSize filter
		if (formData.hasSize !== "all") {
			params.set(
				"filter_hasSize",
				formData.hasSize === "with" ? "true" : "false"
			);
		}

		startTransition(() => {
			router.push(`?${params.toString()}`, { scroll: false });
		});
	};

	const clearAllFilters = () => {
		form.reset({
			isActive: "all",
			hasSize: "all",
		});

		const params = new URLSearchParams(searchParams.toString());
		const filterKeys = ["filter_isActive", "filter_hasSize"];
		filterKeys.forEach((key) => params.delete(key));
		params.set("page", "1");

		startTransition(() => {
			router.push(`?${params.toString()}`, { scroll: false });
		});
	};

	const { hasActiveFilters, activeFiltersCount } = useMemo(() => {
		let count = 0;
		searchParams.forEach((value, key) => {
			if (["page", "perPage", "sortBy", "search"].includes(key)) return;
			if (key.startsWith("filter_")) count += 1;
		});
		return { hasActiveFilters: count > 0, activeFiltersCount: count };
	}, [searchParams]);

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
						<div className="space-y-3">
							<h4 className="font-medium text-sm text-foreground">
								Statut actif
							</h4>
							<div className="space-y-2">
								{[
									{ value: "all", label: "Tous" },
									{ value: "active", label: "Actif uniquement" },
									{ value: "inactive", label: "Inactif uniquement" },
								].map(({ value, label }) => {
									const isSelected = field.state.value === value;
									return (
										<div key={value} className="flex items-center space-x-2">
											<Checkbox
												id={`active-${value}`}
												checked={isSelected}
												onCheckedChange={(checked) => {
													if (checked) {
														field.handleChange(value);
													}
												}}
												className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
											/>
											<Label
												htmlFor={`active-${value}`}
												className="text-sm font-normal cursor-pointer flex-1"
											>
												{label}
											</Label>
										</div>
									);
								})}
							</div>
						</div>
					)}
				</form.Field>

				{/* hasSize Filter */}
				<form.Field name="hasSize">
					{(field) => (
						<div className="space-y-3">
							<h4 className="font-medium text-sm text-foreground">
								Configuration des tailles
							</h4>
							<div className="space-y-2">
								{[
									{ value: "all", label: "Tous" },
									{ value: "with", label: "Avec configuration" },
									{ value: "without", label: "Sans configuration" },
								].map(({ value, label }) => {
									const isSelected = field.state.value === value;
									return (
										<div key={value} className="flex items-center space-x-2">
											<Checkbox
												id={`size-${value}`}
												checked={isSelected}
												onCheckedChange={(checked) => {
													if (checked) {
														field.handleChange(value);
													}
												}}
												className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
											/>
											<Label
												htmlFor={`size-${value}`}
												className="text-sm font-normal cursor-pointer flex-1"
											>
												{label}
											</Label>
										</div>
									);
								})}
							</div>
						</div>
					)}
				</form.Field>
			</form>
		</FilterSheetWrapper>
	);
}
