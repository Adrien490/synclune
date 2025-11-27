"use client";

import { FilterSheetWrapper } from "@/shared/components/filter-sheet";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Label } from "@/shared/components/ui/label";
import { useForm } from "@tanstack/react-form";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useTransition } from "react";

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

	const initialValues = useMemo((): FilterFormData => {
		let hasProducts = "all";

		searchParams.forEach((value, key) => {
			if (key === "filter_hasProducts") {
				hasProducts = value === "true" ? "with" : "without";
			}
		});

		return {
			hasProducts,
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
				{/* hasProducts Filter */}
				<form.Field name="hasProducts">
					{(field) => (
						<div className="space-y-3">
							<h4 className="font-medium text-sm text-foreground">Bijoux</h4>
							<div className="space-y-2">
								{[
									{ value: "all", label: "Tous" },
									{ value: "with", label: "Avec bijoux" },
									{ value: "without", label: "Sans bijoux" },
								].map(({ value, label }) => {
									const isSelected = field.state.value === value;
									return (
										<div key={value} className="flex items-center space-x-2">
											<Checkbox
												id={`products-${value}`}
												checked={isSelected}
												onCheckedChange={(checked) => {
													if (checked) {
														field.handleChange(value);
													}
												}}
												className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
											/>
											<Label
												htmlFor={`products-${value}`}
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
