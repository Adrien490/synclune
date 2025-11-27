"use client";

import { useForm } from "@tanstack/react-form";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useTransition } from "react";

import { Role } from "@/app/generated/prisma/browser";
import { FilterSheetWrapper } from "@/shared/components/filter-sheet";
import { Checkbox } from "@/shared/components/ui/checkbox";
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
	const activeFilterCount = useMemo(() => {
		let count = 0;
		if (searchParams.get("filter_role")) count++;
		if (searchParams.get("filter_emailVerified")) count++;
		if (searchParams.get("filter_marketingOptIn")) count++;
		if (searchParams.get("filter_hasOrders")) count++;
		if (searchParams.get("filter_includeDeleted") === "true") count++;
		return count;
	}, [searchParams]);

	// Build initial values from URL params
	const initialValues = useMemo((): FilterValues => {
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
	}, [searchParams]);

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
					{/* Rôle */}
					<div className="space-y-3">
						<h4 className="text-sm font-medium">Rôle</h4>
						<form.Field name="role">
							{(field) => (
								<div className="space-y-2">
									<label className="flex items-center gap-2 cursor-pointer">
										<Checkbox
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
										/>
										<span className="text-sm">Utilisateur</span>
									</label>
									<label className="flex items-center gap-2 cursor-pointer">
										<Checkbox
											checked={field.state.value.includes(Role.ADMIN)}
											onCheckedChange={(checked) => {
												if (checked) {
													field.handleChange([
														...field.state.value,
														Role.ADMIN,
													]);
												} else {
													field.handleChange(
														field.state.value.filter((r) => r !== Role.ADMIN)
													);
												}
											}}
										/>
										<span className="text-sm">Administrateur</span>
									</label>
								</div>
							)}
						</form.Field>
					</div>

					<Separator />

					{/* Email vérifié */}
					<div className="space-y-3">
						<h4 className="text-sm font-medium">Email vérifié</h4>
						<form.Field name="emailVerified">
							{(field) => (
								<div className="space-y-2">
									{[
										{ value: undefined, label: "Tous" },
										{ value: true, label: "Oui" },
										{ value: false, label: "Non" },
									].map(({ value, label }) => {
										const isSelected = field.state.value === value;
										return (
											<div
												key={String(value)}
												className="flex items-center space-x-2"
											>
												<Checkbox
													id={`emailVerified-${label}`}
													checked={isSelected}
													onCheckedChange={(checked) => {
														if (checked) {
															field.handleChange(value);
														}
													}}
												/>
												<Label
													htmlFor={`emailVerified-${label}`}
													className="text-sm font-normal cursor-pointer flex-1"
												>
													{label}
												</Label>
											</div>
										);
									})}
								</div>
							)}
						</form.Field>
					</div>

					<Separator />

					{/* Marketing opt-in */}
					<div className="space-y-3">
						<h4 className="text-sm font-medium">Marketing opt-in</h4>
						<form.Field name="marketingOptIn">
							{(field) => (
								<div className="space-y-2">
									{[
										{ value: undefined, label: "Tous" },
										{ value: true, label: "Oui" },
										{ value: false, label: "Non" },
									].map(({ value, label }) => {
										const isSelected = field.state.value === value;
										return (
											<div
												key={String(value)}
												className="flex items-center space-x-2"
											>
												<Checkbox
													id={`marketingOptIn-${label}`}
													checked={isSelected}
													onCheckedChange={(checked) => {
														if (checked) {
															field.handleChange(value);
														}
													}}
												/>
												<Label
													htmlFor={`marketingOptIn-${label}`}
													className="text-sm font-normal cursor-pointer flex-1"
												>
													{label}
												</Label>
											</div>
										);
									})}
								</div>
							)}
						</form.Field>
					</div>

					<Separator />

					{/* A des commandes */}
					<div className="space-y-3">
						<h4 className="text-sm font-medium">A des commandes</h4>
						<form.Field name="hasOrders">
							{(field) => (
								<div className="space-y-2">
									{[
										{ value: undefined, label: "Tous" },
										{ value: true, label: "Oui" },
										{ value: false, label: "Non" },
									].map(({ value, label }) => {
										const isSelected = field.state.value === value;
										return (
											<div
												key={String(value)}
												className="flex items-center space-x-2"
											>
												<Checkbox
													id={`hasOrders-${label}`}
													checked={isSelected}
													onCheckedChange={(checked) => {
														if (checked) {
															field.handleChange(value);
														}
													}}
												/>
												<Label
													htmlFor={`hasOrders-${label}`}
													className="text-sm font-normal cursor-pointer flex-1"
												>
													{label}
												</Label>
											</div>
										);
									})}
								</div>
							)}
						</form.Field>
					</div>

					<Separator />

					{/* Inclure supprimés */}
					<div className="space-y-3">
						<form.Field name="includeDeleted">
							{(field) => (
								<div className="flex items-center justify-between">
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
				</div>
			</form>
		</FilterSheetWrapper>
	);
}
