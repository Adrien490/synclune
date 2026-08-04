"use client";

import { FilterSheetWrapper } from "@/shared/components/filter-sheet-wrapper";
import { CheckboxFilterItem } from "@/shared/components/forms/checkbox-filter-item";
import { useAppForm } from "@/shared/components/forms";
import { Calendar } from "@/shared/components/ui/calendar";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { Separator } from "@/shared/components/ui/separator";
import {
	REFUND_STATUS_LABELS,
	REFUND_REASON_LABELS,
} from "@/modules/refunds/constants/refund.constants";
import { cn } from "@/shared/utils/cn";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition, Suspense, type ComponentProps } from "react";

interface RefundsFilterSheetProps {
	className?: string;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	hideTrigger?: boolean;
	/** DOM `id` of the sheet content (paired with `aria-controls`). */
	id?: string;
}

interface FilterFormData {
	status: string;
	reason: string;
	dateRange: {
		from: string;
		to: string;
	};
}

function RefundsFilterSheetInner({
	className,
	open: controlledOpen,
	onOpenChange: controlledOnOpenChange,
	hideTrigger,
	id,
}: RefundsFilterSheetProps = {}) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();

	const [internalOpen, setInternalOpen] = useState(false);
	const isOpen = controlledOpen ?? internalOpen;
	const handleOpenChange = controlledOnOpenChange ?? setInternalOpen;

	const initialValues = ((): FilterFormData => {
		return {
			status: searchParams.get("filter_status") ?? "",
			reason: searchParams.get("filter_reason") ?? "",
			dateRange: {
				from: searchParams.get("filter_createdAfter") ?? "",
				to: searchParams.get("filter_createdBefore") ?? "",
			},
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

		const filterKeys = [
			"filter_status",
			"filter_reason",
			"filter_createdAfter",
			"filter_createdBefore",
		];
		filterKeys.forEach((key) => params.delete(key));

		// Reset pagination
		params.delete("cursor");
		params.delete("direction");

		if (formData.status) {
			params.set("filter_status", formData.status);
		}
		if (formData.reason) {
			params.set("filter_reason", formData.reason);
		}
		if (formData.dateRange.from) {
			params.set("filter_createdAfter", formData.dateRange.from);
		}
		if (formData.dateRange.to) {
			params.set("filter_createdBefore", formData.dateRange.to);
		}

		startTransition(() => {
			router.push(`?${params.toString()}`, { scroll: false });
		});
	};

	const clearAllFilters = () => {
		form.reset({
			status: "",
			reason: "",
			dateRange: { from: "", to: "" },
		});

		const params = new URLSearchParams(searchParams.toString());
		["filter_status", "filter_reason", "filter_createdAfter", "filter_createdBefore"].forEach(
			(key) => params.delete(key),
		);
		params.delete("cursor");
		params.delete("direction");

		startTransition(() => {
			router.push(`?${params.toString()}`, { scroll: false });
		});
	};

	const { hasActiveFilters, activeFiltersCount } = (() => {
		let count = 0;
		if (searchParams.has("filter_status")) count++;
		if (searchParams.has("filter_reason")) count++;
		if (searchParams.has("filter_createdAfter") || searchParams.has("filter_createdBefore"))
			count++;
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
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					void form.handleSubmit();
				}}
				className="space-y-6"
			>
				{/* Refund Status */}
				<form.Field name="status">
					{(field) => (
						<fieldset className="space-y-1">
							<legend className="text-foreground mb-2 text-sm font-medium">
								Statut de remboursement
							</legend>
							{Object.entries(REFUND_STATUS_LABELS).map(([value, label]) => (
								<CheckboxFilterItem
									key={value}
									id={`refund-status-${value}`}
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

				{/* Refund Reason */}
				<form.Field name="reason">
					{(field) => (
						<fieldset className="space-y-1">
							<legend className="text-foreground mb-2 text-sm font-medium">Motif</legend>
							{Object.entries(REFUND_REASON_LABELS).map(([value, label]) => (
								<CheckboxFilterItem
									key={value}
									id={`refund-reason-${value}`}
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

				{/* Date Range */}
				<fieldset className="space-y-3">
					<legend className="text-foreground text-sm font-medium">Période</legend>
					<div className="space-y-3">
						<form.Field name="dateRange.from">
							{(field) => (
								<div className="space-y-2">
									<Label className="text-sm">Du</Label>
									<Popover>
										<PopoverTrigger
											render={
												<Button
													variant="outline"
													className={cn(
														"w-full justify-start text-left font-normal",
														!field.state.value && "text-muted-foreground",
													)}
												/>
											}
										>
											<CalendarIcon className="mr-2 h-4 w-4" />
											{field.state.value ? (
												format(new Date(field.state.value), "PPP", { locale: fr })
											) : (
												<span>Sélectionner une date</span>
											)}
										</PopoverTrigger>
										<PopoverContent className="w-auto p-0" align="start">
											<Calendar
												mode="single"
												selected={field.state.value ? new Date(field.state.value) : undefined}
												onSelect={(date) => {
													field.handleChange(date ? date.toISOString() : "");
												}}
												disabled={(date) => date > new Date() || date < new Date("2020-01-01")}
												// eslint-disable-next-line jsx-a11y/no-autofocus -- Calendar in Popover: focus expected on explicit open
												autoFocus
											/>
										</PopoverContent>
									</Popover>
								</div>
							)}
						</form.Field>
						<form.Field name="dateRange.to">
							{(field) => (
								<div className="space-y-2">
									<Label className="text-sm">Au</Label>
									<Popover>
										<PopoverTrigger
											render={
												<Button
													variant="outline"
													className={cn(
														"w-full justify-start text-left font-normal",
														!field.state.value && "text-muted-foreground",
													)}
												/>
											}
										>
											<CalendarIcon className="mr-2 h-4 w-4" />
											{field.state.value ? (
												format(new Date(field.state.value), "PPP", { locale: fr })
											) : (
												<span>Sélectionner une date</span>
											)}
										</PopoverTrigger>
										<PopoverContent className="w-auto p-0" align="start">
											<Calendar
												mode="single"
												selected={field.state.value ? new Date(field.state.value) : undefined}
												onSelect={(date) => {
													field.handleChange(date ? date.toISOString() : "");
												}}
												disabled={(date) => date > new Date() || date < new Date("2020-01-01")}
												// eslint-disable-next-line jsx-a11y/no-autofocus -- Calendar in Popover: focus expected on explicit open
												autoFocus
											/>
										</PopoverContent>
									</Popover>
								</div>
							)}
						</form.Field>
					</div>
				</fieldset>
			</form>
		</FilterSheetWrapper>
	);
}

export function RefundsFilterSheet(props: ComponentProps<typeof RefundsFilterSheetInner>) {
	return (
		<Suspense fallback={null}>
			<RefundsFilterSheetInner {...props} />
		</Suspense>
	);
}
