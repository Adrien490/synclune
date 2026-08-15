"use client";

import { FieldLabel } from "@/shared/components/forms";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { MultiSelect } from "@/shared/components/multi-select";
import { COLLECTION_DIALOG_ID } from "@/modules/collections/components/admin/collection-form-dialog";
import { PRODUCT_TYPE_DIALOG_ID } from "@/modules/product-types/components/product-type-form-dialog";
import { useDialog } from "@/shared/providers/overlay-store-provider";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { cn } from "@/shared/utils/cn";
import { PlusIcon } from "@phosphor-icons/react/ssr";
import { useRouter } from "next/navigation";
import type {
	CreateProductFormInstance,
	CreateProductFormProps,
} from "./create-product-form-types";
import { FORM_SECTION_ACCENT_CLASS, FORM_SECTION_CARD_CLASS } from "./shared/shared-styles";
import { VariantAttributeFields } from "./shared/variant-attribute-fields";
import { FormSectionTitle } from "@/shared/components/forms/form-section-title";

interface CreateProductInfoCardProps {
	form: CreateProductFormInstance;
	productTypes: CreateProductFormProps["productTypes"];
	collections: CreateProductFormProps["collections"];
	colors: CreateProductFormProps["colors"];
	materials: CreateProductFormProps["materials"];
}

/**
 * Section « Le bijou » du formulaire de création.
 *
 * Réunit ce qui DÉCRIT la pièce — titre, description, type, collections, puis les
 * attributs de la variante initiale (teintes, matériaux, taille). Ce qui DÉCIDE de
 * sa mise en vente (prix, stock, visibilité) vit sur la règle d'établi, en pied de
 * formulaire : cf. `CreateProductEtabliBar`.
 *
 * À la création il n'existe qu'une seule variante, donc la séparer de la pièce ne
 * produisait qu'une carte de plus à traverser — et sa seule glose (« Variante »)
 * était masquée sous 640px de toute façon.
 */
export function CreateProductInfoCard({
	form,
	productTypes,
	collections,
	colors,
	materials,
}: CreateProductInfoCardProps) {
	const router = useRouter();
	const haptic = useHaptic();
	const typeDialog = useDialog(PRODUCT_TYPE_DIALOG_ID);
	const collectionDialog = useDialog(COLLECTION_DIALOG_ID);

	return (
		<Card
			role="region"
			aria-label="Le bijou"
			data-accent="rose"
			className={cn(FORM_SECTION_CARD_CLASS, FORM_SECTION_ACCENT_CLASS)}
			style={{ viewTransitionName: "product-create-info" }}
		>
			<CardHeader className="px-0 sm:px-0 md:px-6">
				<FormSectionTitle>Le bijou</FormSectionTitle>
			</CardHeader>
			<CardContent className="space-y-6 px-0 sm:px-0 md:px-6">
				<form.AppField
					name="name"
					validators={{
						onChange: ({ value }) =>
							!value || String(value).trim().length < 2
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
							className="resize-none"
						/>
					)}
				</form.AppField>

				<form.AppField name="typeId" listeners={{ onChange: () => haptic("selection") }}>
					{(field) => (
						<div className="space-y-2">
							<div className="flex gap-2">
								<div className="flex-1">
									{/* Le label vit DANS SelectField : c'est lui qui nomme le select
									    natif ET le trigger desktop (aria-labelledby) — un label externe
									    laissait le trigger sans nom accessible (axe, lot 7). */}
									<field.SelectField
										label="Type de bijou"
										optional
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
									<PlusIcon className="size-4" />
								</Button>
							</div>
						</div>
					)}
				</form.AppField>

				<form.AppField name="collectionIds">
					{(field) => (
						<div className="space-y-2">
							{/*
							 * `htmlFor` + `id` appariés, comme le fait déjà `ColorMultiSelectField`.
							 * Sans eux, le combobox tirait son nom accessible de son CONTENU : il
							 * s'annonçait « Sélectionner des collections » à vide, puis par le nom
							 * des collections choisies — le champ perdait son identité au moment
							 * précis où il était rempli.
							 */}
							<FieldLabel htmlFor={field.name} optional>
								Collections
							</FieldLabel>
							<div className="flex gap-2">
								<div className="flex-1">
									<MultiSelect
										id={field.name}
										aria-label="Collections"
										options={collections.map((c) => ({
											value: c.id,
											label: c.name,
										}))}
										value={field.state.value}
										onValueChange={(values) => field.handleChange(values)}
										placeholder="Sélectionner des collections"
										aria-describedby="collections-hint"
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
									<PlusIcon className="size-4" />
								</Button>
							</div>
							<p id="collections-hint" className="text-muted-foreground text-xs">
								Un bijou peut appartenir à plusieurs collections
							</p>
						</div>
					)}
				</form.AppField>

				<VariantAttributeFields
					form={form}
					colors={colors}
					materials={materials}
					colorFieldName="initialVariant.colorId"
					materialFieldName="initialVariant.materialId"
					sizeFieldName="initialVariant.size"
				/>
			</CardContent>
		</Card>
	);
}
