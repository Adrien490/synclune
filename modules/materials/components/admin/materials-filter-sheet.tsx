"use client";

import { FilterSheetWrapper } from "@/shared/components/filter-sheet-wrapper";
import { useAppForm } from "@/shared/components/forms";
import { Label } from "@/shared/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/shared/components/ui/radio-group";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition, Suspense, type ComponentProps } from "react";

interface MaterialsFilterSheetProps {
	className?: string;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	hideTrigger?: boolean;
	/** DOM `id` of the sheet content (paired with `aria-controls`). */
	id?: string;
}

interface FilterFormData {
	isActive: string;
}

function MaterialsFilterSheetInner({
	className,
	open: controlledOpen,
	onOpenChange: controlledOnOpenChange,
	hideTrigger,
	id,
}: MaterialsFilterSheetProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();

	const [internalOpen, setInternalOpen] = useState(false);
	const isOpen = controlledOpen ?? internalOpen;
	const handleOpenChange = controlledOnOpenChange ?? setInternalOpen;

	const initialValues = ((): FilterFormData => {
		let isActive = "all";

		searchParams.forEach((value, key) => {
			if (key === "filter_isActive") {
				isActive = value === "true" ? "active" : "inactive";
			}
		});

		return { isActive };
	})();

	const form = useAppForm({
		defaultValues: initialValues,
		onSubmit: async ({ value }: { value: FilterFormData }) => {
			const params = new URLSearchParams(searchParams.toString());
			params.delete("filter_isActive");
			params.set("page", "1");

			if (value.isActive !== "all") {
				params.set("filter_isActive", value.isActive === "active" ? "true" : "false");
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
			id={id}
			activeFiltersCount={activeFiltersCount}
			hasActiveFilters={hasActiveFilters}
			onClearAll={clearAllFilters}
			onApply={() => void form.handleSubmit()}
			isPending={isPending}
			triggerClassName={className}
		>
			<form
				onSubmit={() => {
					void form.handleSubmit();
				}}
				className="space-y-6"
			>
				<form.Field name="isActive">
					{(field) => (
						<fieldset className="space-y-3">
							<legend className="text-foreground text-sm font-medium">Statut</legend>
							<RadioGroup value={field.state.value} onValueChange={field.handleChange}>
								{[
									{ value: "all", label: "Tous" },
									{ value: "active", label: "Actifs" },
									{ value: "inactive", label: "Inactifs" },
								].map(({ value, label }) => (
									<div key={value} className="flex items-center space-x-2">
										<RadioGroupItem value={value} id={`active-${value}`} />
										<Label
											htmlFor={`active-${value}`}
											className="cursor-pointer text-sm font-normal"
										>
											{label}
										</Label>
									</div>
								))}
							</RadioGroup>
						</fieldset>
					)}
				</form.Field>
			</form>
		</FilterSheetWrapper>
	);
}

export function MaterialsFilterSheet(props: ComponentProps<typeof MaterialsFilterSheetInner>) {
	return (
		<Suspense fallback={null}>
			<MaterialsFilterSheetInner {...props} />
		</Suspense>
	);
}
