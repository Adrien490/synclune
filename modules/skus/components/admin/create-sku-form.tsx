"use client";

import { FieldLabel } from "@/shared/components/forms";
import { Button } from "@/shared/components/ui/button";
import { InputGroupAddon, InputGroupText } from "@/shared/components/ui/input-group";
import { useCreateProductSkuForm } from "@/modules/skus/hooks/use-create-sku-form";
import { useUploadThing } from "@/modules/media/utils/uploadthing";
import { useMediaUpload } from "@/modules/media/hooks/use-media-upload";
import { Euro, Package } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { FORM_SUCCESS_REDIRECT_DELAY_MS } from "@/shared/constants/ui-delays";
import { SkuPrimaryImageField } from "./sku-primary-image-field";
import { SkuGalleryField } from "./sku-gallery-field";

interface CreateProductVariantFormProps {
	colors: Array<{
		id: string;
		name: string;
		hex: string;
	}>;
	materials: Array<{
		id: string;
		name: string;
	}>;
	product: {
		id: string;
		title: string;
	};
	productSlug: string;
}

export function CreateProductVariantForm({
	colors,
	materials,
	product,
	productSlug,
}: CreateProductVariantFormProps) {
	const router = useRouter();

	const { startUpload: startPrimaryImageUpload, isUploading: isPrimaryImageUploading } =
		useUploadThing("catalogMedia");

	const { upload: uploadGalleryMedia, isUploading: isGalleryUploading } = useMediaUpload();

	const { form, action } = useCreateProductSkuForm({
		onSuccess: (message) => {
			toast.success(message || "Variante créée avec succès", {
				action: {
					label: "Voir les variantes",
					onClick: () => router.push(`/admin/catalogue/produits/${productSlug}/variantes`),
				},
			});
			setTimeout(() => {
				router.push(`/admin/catalogue/produits/${productSlug}/variantes`);
			}, FORM_SUCCESS_REDIRECT_DELAY_MS);
		},
	});

	useEffect(() => {
		form.setFieldValue("productId", product.id);
	}, [product.id, form]);

	return (
		<>
			<fieldset
				disabled={isPrimaryImageUploading || isGalleryUploading || form.state.isSubmitting}
				className="space-y-6"
			>
				<form
					action={action}
					className="space-y-6 pb-24 sm:pb-28 lg:pb-24"
					onSubmit={() => {
						void form.handleSubmit();
					}}
				>
					<input type="hidden" name="productId" value={product.id} />

					<form.Subscribe selector={(state) => [state.values.primaryImage]}>
						{([primaryImage]) =>
							primaryImage ? (
								<input type="hidden" name="primaryImage" value={JSON.stringify(primaryImage)} />
							) : null
						}
					</form.Subscribe>

					<form.Subscribe selector={(state) => [state.values.galleryMedia]}>
						{([galleryMedia]) =>
							galleryMedia && galleryMedia.length > 0 ? (
								<input type="hidden" name="galleryMedia" value={JSON.stringify(galleryMedia)} />
							) : null
						}
					</form.Subscribe>

					{/* La variante */}
					<div className="space-y-6">
						{/* Caractéristiques */}
						<div className="space-y-4">
							{/* Couleur */}
							<form.AppField name="colorId">
								{(field) => (
									<div className="space-y-2">
										<FieldLabel htmlFor={field.name} optional>
											Couleur
										</FieldLabel>
										<field.SelectField
											label=""
											options={colors.map((color) => ({
												value: color.id,
												label: color.name,
											}))}
											renderOption={(option) => {
												const color = colors.find((c) => c.id === option.value);
												return (
													<div className="flex items-center gap-2">
														{color && (
															<div
																className="border-border h-4 w-4 rounded-full border"
																style={{ backgroundColor: color.hex }}
															/>
														)}
														<span>{option.label}</span>
													</div>
												);
											}}
											renderValue={(value) => {
												const color = colors.find((c) => c.id === value);
												return color ? (
													<div className="flex items-center gap-2">
														<div
															className="border-border h-4 w-4 rounded-full border"
															style={{ backgroundColor: color.hex }}
														/>
														<span>{color.name}</span>
													</div>
												) : (
													<span className="text-muted-foreground">Sélectionner une couleur</span>
												);
											}}
											placeholder="Sélectionner une couleur"
											clearable
										/>
									</div>
								)}
							</form.AppField>

							{/* Matériau + Taille */}
							<div className="space-y-4">
								<form.AppField name="materialId">
									{(field) => (
										<div className="space-y-2">
											<FieldLabel htmlFor={field.name} optional>
												Matériau
											</FieldLabel>
											<field.SelectField
												label=""
												options={materials.map((material) => ({
													value: material.id,
													label: material.name,
												}))}
												placeholder="Sélectionner un matériau"
												clearable
											/>
										</div>
									)}
								</form.AppField>

								<form.AppField name="size">
									{(field) => (
										<div className="space-y-2">
											<FieldLabel optional>Taille</FieldLabel>
											<field.InputGroupField placeholder="Ex: 52, Ajustable..." />
										</div>
									)}
								</form.AppField>
							</div>

							{/* Statut + Par défaut */}
							<div className="space-y-4">
								<form.AppField name="isActive">
									{(field) => (
										<div className="space-y-2">
											<FieldLabel htmlFor={field.name} required>
												Statut
											</FieldLabel>
											<field.RadioGroupField
												label=""
												options={[
													{ value: "true", label: "Actif" },
													{ value: "false", label: "Inactif" },
												]}
											/>
										</div>
									)}
								</form.AppField>

								<form.AppField name="isDefault">
									{(field) => (
										<div className="space-y-2">
											<FieldLabel optional>Par défaut</FieldLabel>
											<field.CheckboxField label="Variante par défaut" />
											<p className="text-muted-foreground text-xs">Affichée en premier</p>
										</div>
									)}
								</form.AppField>
							</div>
						</div>

						{/* Prix et stock */}
						<div className="space-y-4 border-t pt-6">
							{/* Prix final */}
							<form.AppField
								name="priceInclTaxEuros"
								validators={{
									onChange: ({ value }: { value: number | null }) => {
										if (!value || value <= 0) {
											return "Le prix doit être supérieur à 0";
										}
									},
								}}
							>
								{(field) => (
									<div className="space-y-2">
										<FieldLabel required>Prix final</FieldLabel>
										<field.InputGroupField type="number" step="0.01" required placeholder="0.00">
											<InputGroupAddon>
												<Euro className="h-4 w-4" />
											</InputGroupAddon>
										</field.InputGroupField>
									</div>
								)}
							</form.AppField>

							{/* Prix comparé */}
							<form.AppField
								name="compareAtPriceEuros"
								validators={{
									onChangeListenTo: ["priceInclTaxEuros"],
									onChange: ({ value, fieldApi }) => {
										if (!value) return undefined;
										const price = fieldApi.form.getFieldValue("priceInclTaxEuros");
										if (price && value < price) {
											return "Le prix comparé doit être supérieur au prix de vente";
										}
									},
									onBlur: ({ value, fieldApi }) => {
										if (!value) return undefined;
										const price = fieldApi.form.getFieldValue("priceInclTaxEuros");
										if (price && value < price) {
											return "Le prix comparé doit être supérieur au prix de vente";
										}
									},
								}}
							>
								{(field) => (
									<div className="space-y-2">
										<FieldLabel optional>Prix avant réduction</FieldLabel>
										<field.InputGroupField type="number" step="0.01" placeholder="0.00">
											<InputGroupAddon>
												<Euro className="h-4 w-4" />
											</InputGroupAddon>
										</field.InputGroupField>
									</div>
								)}
							</form.AppField>

							{/* Stock */}
							<form.AppField name="inventory">
								{(field) => (
									<div className="space-y-2">
										<FieldLabel optional>Quantité en stock</FieldLabel>
										<field.InputGroupField type="number" min={0} placeholder="0">
											<InputGroupAddon align="inline-end">
												<Package className="text-muted-foreground h-4 w-4" />
												<InputGroupText className="text-muted-foreground text-xs">
													unités
												</InputGroupText>
											</InputGroupAddon>
										</field.InputGroupField>
									</div>
								)}
							</form.AppField>
						</div>
					</div>

					{/* Visuels */}
					<div className="space-y-6">
						{/* Image principale */}
						<form.Field name="primaryImage">
							{(field) => (
								<SkuPrimaryImageField
									value={field.state.value}
									onChange={(value) => field.handleChange(value)}
									productName={product.title}
									startUpload={startPrimaryImageUpload}
									isUploading={isPrimaryImageUploading}
								/>
							)}
						</form.Field>

						{/* Galerie */}
						<form.Field name="galleryMedia" mode="array">
							{(field) => (
								<SkuGalleryField
									value={field.state.value}
									setValue={(value) => field.setValue(value)}
									pushValue={(value) => field.pushValue(value)}
									productName={product.title}
									uploadMedia={uploadGalleryMedia}
									isUploading={isGalleryUploading}
								/>
							)}
						</form.Field>
					</div>

					{/* Footer */}
					<form.AppForm>
						<div className="mt-6">
							<div className="flex items-center justify-between gap-4">
								<Button
									type="button"
									variant="outline"
									onClick={() => router.push(`/admin/catalogue/produits/${productSlug}/variantes`)}
								>
									Annuler
								</Button>
								<form.Subscribe selector={(state) => [state.canSubmit]}>
									{([canSubmit]) => (
										<Button
											type="submit"
											disabled={
												!canSubmit ||
												form.state.isSubmitting ||
												isPrimaryImageUploading ||
												isGalleryUploading
											}
											className="min-w-40"
										>
											{form.state.isSubmitting
												? "Création..."
												: isPrimaryImageUploading || isGalleryUploading
													? "Upload..."
													: "Créer la variante"}
										</Button>
									)}
								</form.Subscribe>
							</div>
						</div>
					</form.AppForm>
				</form>
			</fieldset>
		</>
	);
}
