"use client";

import { FieldLabel } from "@/shared/components/forms";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { MultiSelect } from "@/shared/components/multi-select";
import { COLLECTION_DIALOG_ID } from "@/modules/collections/components/admin/collection-form-dialog";
import { PRODUCT_TYPE_DIALOG_ID } from "@/modules/product-types/components/product-type-form-dialog";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import type { EditProductFormInstance, EditProductFormProps } from "./edit-product-form-types";
import { FORM_SECTION_CARD_CLASS, MOBILE_SECTION_TITLE } from "./shared/shared-styles";

interface EditProductInfoCardProps {
	form: EditProductFormInstance;
	productTypes: EditProductFormProps["productTypes"];
	collections: EditProductFormProps["collections"];
}

export function EditProductInfoCard({ form, productTypes, collections }: EditProductInfoCardProps) {
	const router = useRouter();
	const haptic = useHaptic();
	const typeDialog = useDialog(PRODUCT_TYPE_DIALOG_ID);
	const collectionDialog = useDialog(COLLECTION_DIALOG_ID);

	return (
		<Card
			role="region"
			aria-label="Informations générales du bijou"
			className={FORM_SECTION_CARD_CLASS}
			style={{ viewTransitionName: "product-edit-info" }}
		>
			<CardHeader className="px-0 sm:px-0 lg:px-6">
				<CardTitle className={MOBILE_SECTION_TITLE}>Informations</CardTitle>
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
								aria-describedby="title-edit-hint"
							/>
							<p id="title-edit-hint" className="text-muted-foreground text-xs">
								Le slug d'URL restera inchangé pour préserver les liens SEO existants
							</p>
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
							<div className="flex gap-2">
								<div className="flex-1">
									<MultiSelect
										options={collections.map((c) => ({
											value: c.id,
											label: c.name,
										}))}
										value={field.state.value}
										onValueChange={(values) => field.handleChange(values)}
										placeholder="Sélectionner des collections"
										aria-describedby="collections-edit-hint"
									/>
								</div>
								<Button
									type="button"
									variant="outline"
									size="icon"
									className="min-h-11 min-w-11 shrink-0 sm:min-h-9 sm:min-w-9"
									onClick={() => {
										haptic("light");
										collectionDialog.open({
											onCreated: (id: string) => {
												field.handleChange([...field.state.value, id]);
												router.refresh();
											},
										});
									}}
									aria-label="Créer une nouvelle collection"
								>
									<Plus className="size-4" />
								</Button>
							</div>
							<p id="collections-edit-hint" className="text-muted-foreground text-xs">
								Un produit peut appartenir à plusieurs collections
							</p>
						</div>
					)}
				</form.AppField>
			</CardContent>
		</Card>
	);
}
