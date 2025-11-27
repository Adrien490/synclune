"use client";

import { FilterSheetWrapper } from "@/shared/components/filter-sheet";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Label } from "@/shared/components/ui/label";
import { useForm } from "@tanstack/react-form";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useTransition } from "react";
import { DiscountType } from "@/app/generated/prisma/browser";
import { DISCOUNT_TYPE_LABELS } from "@/modules/discount/constants/discount.constants";

interface DiscountsFilterSheetProps {
	className?: string;
}

interface FilterFormData {
	type: string;
	isActive: string;
	hasUsages: string;
	isExpired: string;
}

export function DiscountsFilterSheet({ className }: DiscountsFilterSheetProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();

	const initialValues = useMemo((): FilterFormData => {
		const values: FilterFormData = {
			type: "all",
			isActive: "all",
			hasUsages: "all",
			isExpired: "all",
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
			if (key === "filter_isExpired") {
				values.isExpired = value === "true" ? "expired" : "valid";
			}
		});

		return values;
	}, [searchParams]);

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
			"filter_isExpired",
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
		if (formData.isExpired !== "all") {
			params.set("filter_isExpired", formData.isExpired === "expired" ? "true" : "false");
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
			isExpired: "all",
		});

		const params = new URLSearchParams(searchParams.toString());
		const filterKeys = [
			"filter_type",
			"filter_isActive",
			"filter_hasUsages",
			"filter_isExpired",
		];
		filterKeys.forEach((key) => params.delete(key));
		params.delete("cursor");
		params.delete("direction");

		startTransition(() => {
			router.push(`?${params.toString()}`, { scroll: false });
		});
	};

	const { hasActiveFilters, activeFiltersCount } = useMemo(() => {
		let count = 0;
		searchParams.forEach((_, key) => {
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
				{/* Type Filter */}
				<form.Field name="type">
					{(field) => (
						<div className="space-y-3">
							<h4 className="font-medium text-sm text-foreground">Type</h4>
							<div className="space-y-2">
								{[
									{ value: "all", label: "Tous" },
									{ value: DiscountType.PERCENTAGE, label: DISCOUNT_TYPE_LABELS[DiscountType.PERCENTAGE] },
									{ value: DiscountType.FIXED_AMOUNT, label: DISCOUNT_TYPE_LABELS[DiscountType.FIXED_AMOUNT] },
								].map(({ value, label }) => {
									const isSelected = field.state.value === value;
									return (
										<div key={value} className="flex items-center space-x-2">
											<Checkbox
												id={`type-${value}`}
												checked={isSelected}
												onCheckedChange={(checked) => {
													if (checked) {
														field.handleChange(value);
													}
												}}
												className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
											/>
											<Label
												htmlFor={`type-${value}`}
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

				{/* Status Filter */}
				<form.Field name="isActive">
					{(field) => (
						<div className="space-y-3">
							<h4 className="font-medium text-sm text-foreground">Statut</h4>
							<div className="space-y-2">
								{[
									{ value: "all", label: "Tous" },
									{ value: "active", label: "Actifs" },
									{ value: "inactive", label: "Inactifs" },
								].map(({ value, label }) => {
									const isSelected = field.state.value === value;
									return (
										<div key={value} className="flex items-center space-x-2">
											<Checkbox
												id={`status-${value}`}
												checked={isSelected}
												onCheckedChange={(checked) => {
													if (checked) {
														field.handleChange(value);
													}
												}}
												className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
											/>
											<Label
												htmlFor={`status-${value}`}
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

				{/* Usage Filter */}
				<form.Field name="hasUsages">
					{(field) => (
						<div className="space-y-3">
							<h4 className="font-medium text-sm text-foreground">Utilisations</h4>
							<div className="space-y-2">
								{[
									{ value: "all", label: "Tous" },
									{ value: "with", label: "Avec utilisations" },
									{ value: "without", label: "Sans utilisation" },
								].map(({ value, label }) => {
									const isSelected = field.state.value === value;
									return (
										<div key={value} className="flex items-center space-x-2">
											<Checkbox
												id={`usage-${value}`}
												checked={isSelected}
												onCheckedChange={(checked) => {
													if (checked) {
														field.handleChange(value);
													}
												}}
												className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
											/>
											<Label
												htmlFor={`usage-${value}`}
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

				{/* Expiration Filter */}
				<form.Field name="isExpired">
					{(field) => (
						<div className="space-y-3">
							<h4 className="font-medium text-sm text-foreground">Validité</h4>
							<div className="space-y-2">
								{[
									{ value: "all", label: "Tous" },
									{ value: "valid", label: "Valides" },
									{ value: "expired", label: "Expirés" },
								].map(({ value, label }) => {
									const isSelected = field.state.value === value;
									return (
										<div key={value} className="flex items-center space-x-2">
											<Checkbox
												id={`expiry-${value}`}
												checked={isSelected}
												onCheckedChange={(checked) => {
													if (checked) {
														field.handleChange(value);
													}
												}}
												className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
											/>
											<Label
												htmlFor={`expiry-${value}`}
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
