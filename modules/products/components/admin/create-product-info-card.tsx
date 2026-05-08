"use client";

import { FieldLabel } from "@/shared/components/forms";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { MultiSelect } from "@/shared/components/multi-select";
import { PRODUCT_TYPE_DIALOG_ID } from "@/modules/product-types/components/product-type-form-dialog";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import type {
	CreateProductFormInstance,
	CreateProductFormProps,
} from "./create-product-form-types";

interface CreateProductInfoCardProps {
	form: CreateProductFormInstance;
	productTypes: CreateProductFormProps["productTypes"];
	collections: CreateProductFormProps["collections"];
}

export function CreateProductInfoCard({
	form,
	productTypes,
	collections,
}: CreateProductInfoCardProps) {
	const router = useRouter();
	const haptic = useHaptic();
	const typeDialog = useDialog(PRODUCT_TYPE_DIALOG_ID);

	return (
		<Card
			role="region"
			aria-label="Informations générales du bijou"
			className="lg:bg-card gap-3 rounded-none border-0 bg-transparent py-0 shadow-none lg:gap-6 lg:rounded-xl lg:border lg:py-6 lg:shadow-md"
			style={{ viewTransitionName: "product-create-info" }}
		>
			<CardHeader className="px-0 sm:px-0 lg:px-6">
				<CardTitle className="text-muted-foreground lg:text-foreground text-sm font-semibold tracking-wide uppercase lg:text-base lg:font-semibold lg:tracking-normal lg:normal-case">
					Informations
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-6 px-0 sm:px-0 lg:px-6">
				<form.AppField
					name="title"
					validators={{
						onChange: ({ value }) =>
							!value || value.trim().length < 2
								? "Le titre doit contenir au moins 2 caractères"
								: undefined,
					}}
				>
					{(field) => (
						<div className="space-y-2">
							<FieldLabel htmlFor={field.name} required>
								Titre du bijou
							</FieldLabel>
							<field.InputField
								label=""
								required
								enterKeyHint="next"
								autoCapitalize="words"
								autoComplete="off"
							/>
						</div>
					)}
				</form.AppField>

				<form.AppField
					name="description"
					validators={{
						onBlur: ({ value }) =>
							value && value.length > 500
								? "La description ne peut pas dépasser 500 caractères"
								: undefined,
					}}
				>
					{(field) => (
						<field.TextareaField
							label="Description"
							optional
							rows={5}
							maxLength={500}
							showCounter
							enterKeyHint="done"
							autoCapitalize="sentences"
							spellCheck
						/>
					)}
				</form.AppField>

				<form.AppField name="typeId" listeners={{ onChange: () => haptic("selection") }}>
					{(field) => (
						<div className="space-y-2">
							<FieldLabel htmlFor={field.name} optional>
								Type de bijou
							</FieldLabel>
							<div className="flex gap-2">
								<div className="flex-1">
									<field.SelectField
										label=""
										options={productTypes.map((t) => ({
											value: t.id,
											label: t.label,
										}))}
										placeholder="Sélectionner un type"
										clearable
									/>
								</div>
								<Button
									type="button"
									variant="outline"
									size="icon"
									className="min-h-11 min-w-11 shrink-0 sm:min-h-9 sm:min-w-9"
									onClick={() => {
										haptic("light");
										typeDialog.open({
											onCreated: (id: string) => {
												field.handleChange(id);
												router.refresh();
											},
										});
									}}
									aria-label="Créer un nouveau type de produit"
								>
									<Plus className="size-4" />
								</Button>
							</div>
						</div>
					)}
				</form.AppField>

				<form.AppField name="collectionIds">
					{(field) => (
						<div className="space-y-2">
							<FieldLabel optional>Collections</FieldLabel>
							<MultiSelect
								options={collections.map((c) => ({
									value: c.id,
									label: c.name,
								}))}
								defaultValue={field.state.value}
								onValueChange={(values) => {
									haptic("selection");
									field.handleChange(values);
								}}
								placeholder="Sélectionner des collections"
								aria-describedby="collections-hint"
							/>
							<p id="collections-hint" className="text-muted-foreground text-xs">
								Un produit peut appartenir à plusieurs collections
							</p>
						</div>
					)}
				</form.AppField>
			</CardContent>
		</Card>
	);
}
