"use client";

import { FilterSheetWrapper } from "@/shared/components/filter-sheet";
import { useAppForm } from "@/shared/components/tanstack-form";
import { Label } from "@/shared/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/shared/components/ui/radio-group";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useTransition } from "react";

interface MaterialsFilterSheetProps {
	className?: string;
}

interface FilterFormData {
	isActive: string;
}

export function MaterialsFilterSheet({ className }: MaterialsFilterSheetProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();

	const initialValues = useMemo((): FilterFormData => {
		let isActive = "all";

		searchParams.forEach((value, key) => {
			if (key === "filter_isActive") {
				isActive = value === "true" ? "active" : "inactive";
			}
		});

		return { isActive };
	}, [searchParams]);

	const form = useAppForm({
		defaultValues: initialValues,
		onSubmit: async ({ value }: { value: FilterFormData }) => {
			const params = new URLSearchParams(searchParams.toString());
			params.delete("filter_isActive");
			params.set("page", "1");

			if (value.isActive !== "all") {
				params.set(
					"filter_isActive",
					value.isActive === "active" ? "true" : "false"
				);
			}

			startTransition(() => {
				router.push(`?${params.toString()}`, { scroll: false });
			});
		},
	});

	const clearAllFilters = () => {
		form.reset({ isActive: "all" });

		const params = new URLSearchParams(searchParams.toString());
		params.delete("filter_isActive");
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
				onSubmit={() => {
					form.handleSubmit();
				}}
				className="space-y-6"
			>
				<form.Field name="isActive">
					{(field) => (
						<div className="space-y-3">
							<Label className="font-medium text-sm text-foreground">
								Statut
							</Label>
							<RadioGroup
								value={field.state.value}
								onValueChange={field.handleChange}
							>
								{[
									{ value: "all", label: "Tous" },
									{ value: "active", label: "Actifs" },
									{ value: "inactive", label: "Inactifs" },
								].map(({ value, label }) => (
									<div key={value} className="flex items-center space-x-2">
										<RadioGroupItem value={value} id={`active-${value}`} />
										<Label
											htmlFor={`active-${value}`}
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
	);
}
