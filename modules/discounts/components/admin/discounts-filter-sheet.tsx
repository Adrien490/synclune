"use client";

import { DiscountType } from "@/app/generated/prisma/browser";
import { DISCOUNT_TYPE_LABELS } from "@/modules/discounts/constants/discount.constants";
import { FilterSheetWrapper } from "@/shared/components/filter-sheet-wrapper";
import { RadioFilterItem } from "@/shared/components/forms/radio-filter-item";
import { Separator } from "@/shared/components/ui/separator";
import { useForm } from "@tanstack/react-form";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

interface DiscountsFilterSheetProps {
	className?: string;
}

interface FilterFormData {
	type: string;
	isActive: string;
	hasUsages: string;
}

export function DiscountsFilterSheet({ className }: DiscountsFilterSheetProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();

	const initialValues = ((): FilterFormData => {
		const values: FilterFormData = {
			type: "all",
			isActive: "all",
			hasUsages: "all",
		};

		searchParams.forEach((value, key) => {
			if (key === "filter_type") {
				values.type = value;
			}
			if (key === "filter_isActive") {
				values.isActive = value === "true" ? "active" : "inactive";
			}
			if (key === "filter_hasUsages") {
				values.hasUsages = value === "true" ? "with" : "without";
			}
		});

		return values;
	})();

	const form = useForm({
		defaultValues: initialValues,
		onSubmit: async ({ value }: { value: FilterFormData }) => {
			applyFilters(value);
		},
	});

	const applyFilters = (formData: FilterFormData) => {
		const params = new URLSearchParams(searchParams.toString());

		const filterKeys = [
			"filter_type",
			"filter_isActive",
			"filter_hasUsages",
		];
		filterKeys.forEach((key) => params.delete(key));
		params.delete("cursor");
		params.delete("direction");

		if (formData.type !== "all") {
			params.set("filter_type", formData.type);
		}
		if (formData.isActive !== "all") {
			params.set("filter_isActive", formData.isActive === "active" ? "true" : "false");
		}
		if (formData.hasUsages !== "all") {
			params.set("filter_hasUsages", formData.hasUsages === "with" ? "true" : "false");
		}

		startTransition(() => {
			router.push(`?${params.toString()}`, { scroll: false });
		});
	};

	const clearAllFilters = () => {
		form.reset({
			type: "all",
			isActive: "all",
			hasUsages: "all",
		});

		const params = new URLSearchParams(searchParams.toString());
		const filterKeys = [
			"filter_type",
			"filter_isActive",
			"filter_hasUsages",
		];
		filterKeys.forEach((key) => params.delete(key));
		params.delete("cursor");
		params.delete("direction");

		startTransition(() => {
			router.push(`?${params.toString()}`, { scroll: false });
		});
	};

	const { hasActiveFilters, activeFiltersCount } = (() => {
		let count = 0;
		searchParams.forEach((_, key) => {
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
				{/* Type Filter */}
				<form.Field name="type">
					{(field) => (
						<fieldset className="space-y-1">
							<legend className="font-medium text-sm text-foreground mb-2">
								Type
							</legend>
							{[
								{ value: "all", label: "Tous" },
								{ value: DiscountType.PERCENTAGE, label: DISCOUNT_TYPE_LABELS[DiscountType.PERCENTAGE] },
								{ value: DiscountType.FIXED_AMOUNT, label: DISCOUNT_TYPE_LABELS[DiscountType.FIXED_AMOUNT] },
							].map(({ value, label }) => (
								<RadioFilterItem
									key={value}
									id={`type-${value}`}
									name="type"
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

				<Separator />

				{/* Status Filter */}
				<form.Field name="isActive">
					{(field) => (
						<fieldset className="space-y-1">
							<legend className="font-medium text-sm text-foreground mb-2">
								Statut
							</legend>
							{[
								{ value: "all", label: "Tous" },
								{ value: "active", label: "Actifs" },
								{ value: "inactive", label: "Inactifs" },
							].map(({ value, label }) => (
								<RadioFilterItem
									key={value}
									id={`status-${value}`}
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

				<Separator />

				{/* Usage Filter */}
				<form.Field name="hasUsages">
					{(field) => (
						<fieldset className="space-y-1">
							<legend className="font-medium text-sm text-foreground mb-2">
								Utilisations
							</legend>
							{[
								{ value: "all", label: "Tous" },
								{ value: "with", label: "Avec utilisations" },
								{ value: "without", label: "Sans utilisation" },
							].map(({ value, label }) => (
								<RadioFilterItem
									key={value}
									id={`usage-${value}`}
									name="hasUsages"
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
