"use client";

import { FieldLabel } from "@/shared/components/forms";
import { Button } from "@/shared/components/ui/button";
import { InputGroupAddon } from "@/shared/components/ui/input-group";
import { MultiSelect } from "@/shared/components/multi-select";
import type { GetProductReturn } from "@/modules/products/types/product.types";
import { useUpdateProductForm } from "@/modules/products/hooks/use-update-product-form";
import { useMediaUpload } from "@/modules/media/hooks/use-media-upload";
import { Euro } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FORM_SUCCESS_REDIRECT_DELAY_MS } from "@/shared/constants/ui-delays";
import { EditProductMediaSection } from "./edit-product-media-section";

interface EditProductFormProps {
	product: GetProductReturn;
	productTypes: Array<{ id: string; label: string }>;
	collections: Array<{ id: string; name: string }>;
	colors: Array<{ id: string; name: string; hex: string }>;
	materials: Array<{ id: string; name: string }>;
}

export function EditProductForm({
	product,
	productTypes,
	collections,
	colors,
	materials,
}: EditProductFormProps) {
	const router = useRouter();

	const { upload: uploadMedia, isUploading: isMediaUploading, progress: uploadProgress } =
		useMediaUpload();

	const { form, action, isPending } = useUpdateProductForm({
		product,
		onSuccess: (message) => {
			toast.success(message || "Bijou modifié avec succès", {
				action: {
					label: "Voir les bijoux",
					onClick: () => router.push("/admin/catalogue/produits"),
				},
			});
			setTimeout(() => {
				router.push("/admin/catalogue/produits");
			}, FORM_SUCCESS_REDIRECT_DELAY_MS);
		},
	});

	const originalImageUrls = (() => {
		const urls: string[] = [];
		const defaultSku = product.skus[0];
		if (defaultSku) {
			defaultSku.images.forEach((img) => {
				urls.push(img.url);
			});
		}
		return urls;
	})();

	return (
		<>
			<h1 className="text-2xl font-semibold mb-6">{product.title}</h1>
			<form
				action={action}
				className="space-y-6 pb-32"
				onSubmit={() => {
					void form.handleSubmit();
				}}
			>
				{/* Champs cachés */}
				<form.Subscribe selector={(state) => [state.values.productId]}>
					{([productId]) => (
						<input type="hidden" name="productId" value={productId} />
					)}
				</form.Subscribe>

				<form.Subscribe selector={(state) => [state.values.defaultSku.skuId]}>
					{([skuId]) => (
						<input type="hidden" name="defaultSku.skuId" value={skuId} />
					)}
				</form.Subscribe>

				<form.Subscribe
					selector={(state) => [state.values.defaultSku.media]}
				>
					{([media]) =>
						media && media.length > 0 ? (
							<input
								type="hidden"
								name="defaultSku.media"
								value={JSON.stringify(media)}
							/>
						) : null
					}
				</form.Subscribe>

				<form.Subscribe selector={(state) => [state.values.status]}>
					{([status]) => <input type="hidden" name="status" value={status} />}
				</form.Subscribe>

				<form.Subscribe selector={(state) => [state.values.defaultSku.isActive]}>
					{([isActive]) => (
						<input
							type="hidden"
							name="defaultSku.isActive"
							value={String(isActive)}
						/>
					)}
				</form.Subscribe>

				<form.Subscribe selector={(state) => [state.values.collectionIds]}>
					{([collectionIds]) => (
						<input
							type="hidden"
							name="collectionIds"
							value={JSON.stringify(collectionIds || [])}
						/>
					)}
				</form.Subscribe>

				<form.Subscribe
					selector={(state) => [state.values.defaultSku.media]}
				>
					{([media]) => {
						const currentUrls: string[] = [];
						if (media && Array.isArray(media)) {
							media.forEach((m: { url?: string }) => {
								if (m && m.url) {
									currentUrls.push(m.url);
								}
							});
						}

						const deletedUrls = originalImageUrls.filter(
							(url) => !currentUrls.includes(url)
						);

						return deletedUrls.length > 0 ? (
							<input
								type="hidden"
								name="deletedImageUrls"
								value={JSON.stringify(deletedUrls)}
							/>
						) : null;
					}}
				</form.Subscribe>

				<div className="space-y-6">
					{/* Le bijou */}
						<form.AppField
							name="title"
							validators={{
								onBlur: ({ value }) => {
									if (!value || value.trim().length < 2) {
										return "Le titre doit contenir au moins 2 caractères";
									}
								},
							}}
						>
							{(field) => (
								<div className="space-y-2">
									<FieldLabel htmlFor={field.name} required>Titre du bijou</FieldLabel>
									<field.InputField label="" required />
									<p className="text-xs text-muted-foreground">
										⚠️ Le slug restera inchangé pour préserver les liens SEO
									</p>
								</div>
							)}
						</form.AppField>

						{/* Description */}
						<form.AppField
							name="description"
							validators={{
								onBlur: ({ value }) => {
									if (value && value.length > 500) {
										return "La description ne peut pas dépasser 500 caractères";
									}
								},
							}}
						>
							{(field) => (
								<field.TextareaField
									label="Description"
									optional
									rows={3}
									maxLength={500}
									showCounter
								/>
							)}
						</form.AppField>

						{/* Type de bijou + Collection */}
						<div className="space-y-4">
							<form.AppField name="typeId">
								{(field) => (
									<div className="space-y-2">
										<FieldLabel htmlFor={field.name} optional>Type de bijou</FieldLabel>
										<field.SelectField
											label=""
											options={productTypes.map((type) => ({
												value: type.id,
												label: type.label,
											}))}
											placeholder="Sélectionner un type"
											clearable
										/>
									</div>
								)}
							</form.AppField>

							<form.AppField name="collectionIds">
								{(field) => (
									<div className="space-y-2">
										<FieldLabel optional>Collections</FieldLabel>
										<MultiSelect
											options={collections.map((col) => ({
												value: col.id,
												label: col.name,
											}))}
											defaultValue={field.state.value || []}
											onValueChange={(values) => field.handleChange(values)}
											placeholder="Sélectionner des collections"
											maxCount={2}
											hideSelectAll
										/>
										<p className="text-xs text-muted-foreground">
											Un produit peut appartenir à plusieurs collections
										</p>
									</div>
								)}
							</form.AppField>
						</div>

						{/* Couleur */}
						<form.AppField name="defaultSku.colorId">
							{(field) => (
								<div className="space-y-2">
									<FieldLabel htmlFor={field.name} optional>Couleur</FieldLabel>
									<field.SelectField
										label=""
										options={colors.map((color) => ({
											value: color.id,
											label: color.name,
										}))}
										renderOption={(option) => {
											const color = colors.find(
												(c) => c.id === option.value
											);
											return (
												<div className="flex items-center gap-2">
													{color && (
														<div
															className="w-4 h-4 rounded-full border border-border"
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
														className="w-4 h-4 rounded-full border border-border"
														style={{ backgroundColor: color.hex }}
													/>
													<span>{color.name}</span>
												</div>
											) : (
												<span className="text-muted-foreground">
													Sélectionner une couleur
												</span>
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
							<form.AppField name="defaultSku.materialId">
								{(field) => (
									<div className="space-y-2">
										<FieldLabel htmlFor={field.name} optional>Matériau</FieldLabel>
										<field.SelectField
											label=""
											options={materials.map((m) => ({
												value: m.id,
												label: m.name,
											}))}
											placeholder="Sélectionner un matériau"
											clearable
										/>
									</div>
								)}
							</form.AppField>

							<form.AppField name="defaultSku.size">
								{(field) => (
									<div className="space-y-2">
										<FieldLabel optional>Taille</FieldLabel>
										<field.InputGroupField placeholder="Ex: 52, Ajustable..." />
									</div>
								)}
							</form.AppField>
						</div>

						{/* Status */}
						<form.AppField name="status">
							{(field) => (
								<div className="space-y-2">
									<FieldLabel htmlFor={field.name} required>Statut</FieldLabel>
									<field.RadioGroupField
										label=""
										options={[
											{ value: "DRAFT", label: "Brouillon" },
											{ value: "PUBLIC", label: "Public" },
											{ value: "ARCHIVED", label: "Archivé" },
										]}
									/>
									<p className="text-xs text-muted-foreground">
										⚠️ Archiver désactive automatiquement toutes les variantes
									</p>
								</div>
							)}
						</form.AppField>
					{/* Prix et stock */}
						<form.AppField
							name="defaultSku.priceInclTaxEuros"
							validators={{
								onChange: ({ value }: { value: number }) => {
									if (!value || value <= 0) {
										return "Le prix doit être supérieur à 0";
									}
								},
							}}
						>
							{(field) => (
								<div className="space-y-2">
									<FieldLabel required>Prix de vente final</FieldLabel>
									<field.InputGroupField
										type="number"
										step="0.01"
										required
										placeholder="0.00"
									>
										<InputGroupAddon>
											<Euro className="h-4 w-4" />
										</InputGroupAddon>
									</field.InputGroupField>
									<p className="text-xs text-muted-foreground">
										Le prix que paiera le client
									</p>
								</div>
							)}
						</form.AppField>

						{/* Prix comparé */}
						<form.AppField
							name="defaultSku.compareAtPriceEuros"
							validators={{
								onChangeListenTo: ["defaultSku.priceInclTaxEuros"],
								onChange: ({ value, fieldApi }) => {
									if (!value) return undefined;
									const price = fieldApi.form.getFieldValue(
										"defaultSku.priceInclTaxEuros"
									);
									if (price && value < price) {
										return "Le prix comparé doit être supérieur ou égal au prix de vente";
									}
								},
								onBlur: ({ value, fieldApi }) => {
									if (!value) return undefined;
									const price = fieldApi.form.getFieldValue(
										"defaultSku.priceInclTaxEuros"
									);
									if (price && value < price) {
										return "Le prix comparé doit être supérieur ou égal au prix de vente";
									}
								},
							}}
						>
							{(field) => (
								<div className="space-y-2">
									<FieldLabel optional>Prix comparé (avant réduction)</FieldLabel>
									<field.InputGroupField
										type="number"
										step="0.01"
										placeholder="0.00"
									>
										<InputGroupAddon>
											<Euro className="h-4 w-4" />
										</InputGroupAddon>
									</field.InputGroupField>
									<p className="text-xs text-muted-foreground">
										Si renseigné, affichera le prix barré
									</p>
								</div>
							)}
						</form.AppField>

						{/* SKU actif */}
						<form.AppField name="defaultSku.isActive">
							{(field) => (
								<div className="space-y-2">
									<FieldLabel htmlFor={field.name} required>Statut du SKU</FieldLabel>
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
				{/* Visuels */}
				<form.Field name="defaultSku.media" mode="array">
						{(field) => (
							<EditProductMediaSection
								field={field}
								productTitle={form.state.values.title}
								maxCount={6}
								uploadMedia={uploadMedia}
								isMediaUploading={isMediaUploading}
							/>
						)}
					</form.Field>

				{/* Footer */}
				<form.AppForm>
					<div className="mt-6">
						<div className="flex justify-end">
							<form.Subscribe selector={(state) => [state.canSubmit]}>
								{([canSubmit]) => (
									<Button
										type="submit"
										disabled={
											!canSubmit ||
											isPending ||
											isMediaUploading
										}
										className="min-w-40"
									>
										{isPending
											? "Enregistrement..."
											: isMediaUploading
												? "Upload en cours..."
												: "Enregistrer les modifications"}
									</Button>
								)}
							</form.Subscribe>
						</div>
					</div>
				</form.AppForm>
				</div>
			</form>
		</>
	);
}
