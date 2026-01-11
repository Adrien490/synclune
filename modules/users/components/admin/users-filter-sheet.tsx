"use client";

import { useForm } from "@tanstack/react-form";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { Role } from "@/app/generated/prisma/browser";
import { FilterSheetWrapper } from "@/shared/components/filter-sheet-wrapper";
import { CheckboxFilterItem } from "@/shared/components/forms/checkbox-filter-item";
import { RadioFilterItem } from "@/shared/components/forms/radio-filter-item";
import { Label } from "@/shared/components/ui/label";
import { Separator } from "@/shared/components/ui/separator";
import { Switch } from "@/shared/components/ui/switch";

type FilterValues = {
	role: Role[];
	emailVerified: boolean | undefined;
	marketingOptIn: boolean | undefined;
	hasOrders: boolean | undefined;
	includeDeleted: boolean;
};

export function UsersFilterSheet() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();

	// Compute active filter count
	const activeFilterCount = (() => {
		let count = 0;
		if (searchParams.get("filter_role")) count++;
		if (searchParams.get("filter_emailVerified")) count++;
		if (searchParams.get("filter_marketingOptIn")) count++;
		if (searchParams.get("filter_hasOrders")) count++;
		if (searchParams.get("filter_includeDeleted") === "true") count++;
		return count;
	})();

	// Build initial values from URL params
	const initialValues = ((): FilterValues => {
		const roleParam = searchParams.get("filter_role");
		const roles: Role[] = [];
		if (roleParam) {
			const roleValues = roleParam.split(",");
			roleValues.forEach((val) => {
				if (val === Role.USER) roles.push(Role.USER);
				if (val === Role.ADMIN) roles.push(Role.ADMIN);
			});
		}

		return {
			role: roles,
			emailVerified:
				searchParams.get("filter_emailVerified") === "true"
					? true
					: searchParams.get("filter_emailVerified") === "false"
						? false
						: undefined,
			marketingOptIn:
				searchParams.get("filter_marketingOptIn") === "true"
					? true
					: searchParams.get("filter_marketingOptIn") === "false"
						? false
						: undefined,
			hasOrders:
				searchParams.get("filter_hasOrders") === "true"
					? true
					: searchParams.get("filter_hasOrders") === "false"
						? false
						: undefined,
			includeDeleted: searchParams.get("filter_includeDeleted") === "true",
		};
	})();

	const form = useForm({
		defaultValues: initialValues,
		onSubmit: async ({ value }: { value: FilterValues }) => {
			applyFilters(value);
		},
	});

	const applyFilters = (values: FilterValues) => {
		const params = new URLSearchParams(searchParams.toString());

		// Remove existing filter params
		Array.from(params.keys()).forEach((key) => {
			if (key.startsWith("filter_")) {
				params.delete(key);
			}
		});

		// Add new filter params
		if (values.role.length > 0) {
			params.set("filter_role", values.role.join(","));
		}

		if (values.emailVerified !== undefined) {
			params.set("filter_emailVerified", String(values.emailVerified));
		}

		if (values.marketingOptIn !== undefined) {
			params.set("filter_marketingOptIn", String(values.marketingOptIn));
		}

		if (values.hasOrders !== undefined) {
			params.set("filter_hasOrders", String(values.hasOrders));
		}

		if (values.includeDeleted) {
			params.set("filter_includeDeleted", "true");
		}

		// Reset to first page
		params.delete("cursor");
		params.delete("direction");

		startTransition(() => {
			router.push(`?${params.toString()}`);
		});
	};

	const clearAllFilters = () => {
		const params = new URLSearchParams(searchParams.toString());

		// Remove all filter params
		Array.from(params.keys()).forEach((key) => {
			if (key.startsWith("filter_")) {
				params.delete(key);
			}
		});

		// Reset to first page
		params.delete("cursor");
		params.delete("direction");

		startTransition(() => {
			router.push(`?${params.toString()}`);
		});

		// Reset form
		form.reset();
	};

	return (
		<FilterSheetWrapper
			activeFiltersCount={activeFilterCount}
			hasActiveFilters={activeFilterCount > 0}
			onClearAll={clearAllFilters}
			onApply={() => {
				const values = form.state.values;
				applyFilters(values);
			}}
			isPending={isPending}
			title="Filtres clients"
			description="Filtrer les clients par critères"
			applyButtonText="Appliquer les filtres"
			showCancelButton={false}
		>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					form.handleSubmit();
				}}
			>
				<div className="space-y-6">
					{/* Rôle - Multi-select */}
					<form.Field name="role">
						{(field) => (
							<fieldset className="space-y-1">
								<legend className="text-sm font-medium mb-2">Rôle</legend>
								<CheckboxFilterItem
									id="role-user"
									checked={field.state.value.includes(Role.USER)}
									onCheckedChange={(checked) => {
										if (checked) {
											field.handleChange([...field.state.value, Role.USER]);
										} else {
											field.handleChange(
												field.state.value.filter((r) => r !== Role.USER)
											);
										}
									}}
								>
									Utilisateur
								</CheckboxFilterItem>
								<CheckboxFilterItem
									id="role-admin"
									checked={field.state.value.includes(Role.ADMIN)}
									onCheckedChange={(checked) => {
										if (checked) {
											field.handleChange([...field.state.value, Role.ADMIN]);
										} else {
											field.handleChange(
												field.state.value.filter((r) => r !== Role.ADMIN)
											);
										}
									}}
								>
									Administrateur
								</CheckboxFilterItem>
							</fieldset>
						)}
					</form.Field>

					<Separator />

					{/* Email vérifié - Single-select */}
					<form.Field name="emailVerified">
						{(field) => (
							<fieldset className="space-y-1">
								<legend className="text-sm font-medium mb-2">Email vérifié</legend>
								{[
									{ value: undefined, label: "Tous" },
									{ value: true, label: "Oui" },
									{ value: false, label: "Non" },
								].map(({ value, label }) => (
									<RadioFilterItem
										key={String(value)}
										id={`emailVerified-${label}`}
										name="emailVerified"
										value={String(value)}
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

					{/* Marketing opt-in - Single-select */}
					<form.Field name="marketingOptIn">
						{(field) => (
							<fieldset className="space-y-1">
								<legend className="text-sm font-medium mb-2">Marketing opt-in</legend>
								{[
									{ value: undefined, label: "Tous" },
									{ value: true, label: "Oui" },
									{ value: false, label: "Non" },
								].map(({ value, label }) => (
									<RadioFilterItem
										key={String(value)}
										id={`marketingOptIn-${label}`}
										name="marketingOptIn"
										value={String(value)}
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

					{/* A des commandes - Single-select */}
					<form.Field name="hasOrders">
						{(field) => (
							<fieldset className="space-y-1">
								<legend className="text-sm font-medium mb-2">A des commandes</legend>
								{[
									{ value: undefined, label: "Tous" },
									{ value: true, label: "Oui" },
									{ value: false, label: "Non" },
								].map(({ value, label }) => (
									<RadioFilterItem
										key={String(value)}
										id={`hasOrders-${label}`}
										name="hasOrders"
										value={String(value)}
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

					{/* Inclure supprimés - Switch toggle */}
					<form.Field name="includeDeleted">
						{(field) => (
							<div className="flex items-center justify-between min-h-11">
								<Label
									htmlFor="includeDeleted"
									className="text-sm font-medium"
								>
									Inclure les clients supprimés
								</Label>
								<Switch
									id="includeDeleted"
									checked={field.state.value}
									onCheckedChange={field.handleChange}
								/>
							</div>
						)}
					</form.Field>
				</div>
			</form>
		</FilterSheetWrapper>
	);
}
