"use client";

import { CollectionStatus } from "@/app/generated/prisma/browser";
import { FilterSheetWrapper } from "@/shared/components/filter-sheet-wrapper";
import { CheckboxFilterItem } from "@/shared/components/forms/checkbox-filter-item";
import { RadioFilterItem } from "@/shared/components/forms/radio-filter-item";
import { useAppForm } from "@/shared/components/forms";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition, Suspense, type ComponentProps } from "react";

interface CollectionsFilterSheetProps {
	className?: string;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	hideTrigger?: boolean;
}

interface FilterFormData {
	hasProducts: string;
	statuses: string[];
}

const STATUS_OPTIONS: ReadonlyArray<{ value: CollectionStatus; label: string }> = [
	{ value: CollectionStatus.PUBLIC, label: "Publiées" },
	{ value: CollectionStatus.DRAFT, label: "Brouillons" },
	{ value: CollectionStatus.ARCHIVED, label: "Archivées" },
];

const VALID_STATUS_VALUES = new Set<string>(STATUS_OPTIONS.map((o) => o.value));

function CollectionsFilterSheetInner({
	className,
	open: controlledOpen,
	onOpenChange: controlledOnOpenChange,
	hideTrigger,
}: CollectionsFilterSheetProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();

	const [internalOpen, setInternalOpen] = useState(false);
	const isOpen = controlledOpen ?? internalOpen;
	const handleOpenChange = controlledOnOpenChange ?? setInternalOpen;

	const initialValues = ((): FilterFormData => {
		let hasProducts = "all";
		const statuses: string[] = [];

		searchParams.forEach((value, key) => {
			if (key === "filter_hasProducts") {
				hasProducts = value === "true" ? "with" : "without";
			} else if (key === "filter_status" && VALID_STATUS_VALUES.has(value)) {
				statuses.push(value);
			}
		});

		return {
			hasProducts,
			statuses: Array.from(new Set(statuses)),
		};
	})();

	const form = useAppForm({
		defaultValues: initialValues,
		onSubmit: async ({ value }: { value: FilterFormData }) => {
			applyFilters(value);
		},
	});

	const applyFilters = (formData: FilterFormData) => {
		const params = new URLSearchParams(searchParams.toString());

		const filterKeys = ["filter_hasProducts", "filter_status"];
		filterKeys.forEach((key) => params.delete(key));
		params.delete("cursor");
		params.delete("direction");

		// Add hasProducts filter
		if (formData.hasProducts !== "all") {
			params.set("filter_hasProducts", formData.hasProducts === "with" ? "true" : "false");
		}

		// Add status filter (multi-select)
		formData.statuses.forEach((s) => params.append("filter_status", s));

		startTransition(() => {
			router.push(`?${params.toString()}`, { scroll: false });
		});
	};

	const clearAllFilters = () => {
		form.reset({
			hasProducts: "all",
			statuses: [],
		});

		const params = new URLSearchParams(searchParams.toString());
		const filterKeys = ["filter_hasProducts", "filter_status"];
		filterKeys.forEach((key) => params.delete(key));
		params.delete("cursor");
		params.delete("direction");

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
			open={isOpen}
			onOpenChange={handleOpenChange}
			hideTrigger={hideTrigger}
			activeFiltersCount={activeFiltersCount}
			hasActiveFilters={hasActiveFilters}
			onClearAll={clearAllFilters}
			onApply={() => void form.handleSubmit()}
			isPending={isPending}
			triggerClassName={className}
		>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					void form.handleSubmit();
				}}
				className="space-y-6"
			>
				{/* Status Filter (multi-select) */}
				<form.Field name="statuses">
					{(field) => (
						<fieldset className="space-y-1">
							<legend className="text-foreground mb-2 text-sm font-medium">Statut</legend>
							{STATUS_OPTIONS.map(({ value, label }) => {
								const checked = field.state.value.includes(value);
								return (
									<CheckboxFilterItem
										key={value}
										id={`status-${value}`}
										checked={checked}
										onCheckedChange={(next) => {
											const current = field.state.value;
											field.handleChange(
												next ? [...current, value] : current.filter((v) => v !== value),
											);
										}}
									>
										{label}
									</CheckboxFilterItem>
								);
							})}
						</fieldset>
					)}
				</form.Field>

				{/* hasProducts Filter */}
				<form.Field name="hasProducts">
					{(field) => (
						<fieldset className="space-y-1">
							<legend className="text-foreground mb-2 text-sm font-medium">Bijoux</legend>
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

export function CollectionsFilterSheet(props: ComponentProps<typeof CollectionsFilterSheetInner>) {
	return (
		<Suspense fallback={null}>
			<CollectionsFilterSheetInner {...props} />
		</Suspense>
	);
}
