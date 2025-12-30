"use client";

import { FieldLabel } from "@/shared/components/forms";
import { MediaCounterBadge } from "@/modules/media/components/media-counter-badge";
import { MediaUploadGrid } from "@/modules/media/components/admin/media-upload-grid";
import { PrimaryImageUpload } from "@/modules/media/components/admin/primary-image-upload";
import { Button } from "@/shared/components/ui/button";
import { InputGroupAddon, InputGroupText } from "@/shared/components/ui/input-group";
import { Label } from "@/shared/components/ui/label";
import { UploadProgress } from "@/modules/media/components/admin/upload-progress";
import { useCreateProductSkuForm } from "@/modules/skus/hooks/use-create-sku-form";
import { cn } from "@/shared/utils/cn";
import { UploadDropzone, useUploadThing } from "@/modules/media/utils/uploadthing";
import { useMediaUpload } from "@/modules/media/hooks/use-media-upload";
import { AnimatePresence, motion } from "motion/react";
import { Euro, ImagePlus, Info, Package, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { FORM_SUCCESS_REDIRECT_DELAY_MS } from "@/shared/constants/ui-delays";

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

	const {
		startUpload: startPrimaryImageUpload,
		isUploading: isPrimaryImageUploading,
	} = useUploadThing("catalogMedia");

	const { upload: uploadGalleryMedia, isUploading: isGalleryUploading } = useMediaUpload();

	const { form, action } = useCreateProductSkuForm({
		onSuccess: (message) => {
			toast.success(message || "Variante créée avec succès", {
				action: {
					label: "Voir les variantes",
					onClick: () =>
						router.push(
							`/admin/catalogue/produits/${productSlug}/variantes`
						),
				},
			});
			setTimeout(() => {
				router.push(
					`/admin/catalogue/produits/${productSlug}/variantes`
				);
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
								<input
									type="hidden"
									name="primaryImage"
									value={JSON.stringify(primaryImage)}
								/>
							) : null
						}
					</form.Subscribe>

					<form.Subscribe selector={(state) => [state.values.galleryMedia]}>
						{([galleryMedia]) =>
							galleryMedia && galleryMedia.length > 0 ? (
								<input
									type="hidden"
									name="galleryMedia"
									value={JSON.stringify(galleryMedia)}
								/>
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
											<FieldLabel htmlFor={field.name} optional>Couleur</FieldLabel>
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
									<form.AppField name="materialId">
										{(field) => (
											<div className="space-y-2">
												<FieldLabel htmlFor={field.name} optional>Matériau</FieldLabel>
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
												<FieldLabel htmlFor={field.name} required>Statut</FieldLabel>
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
												<p className="text-xs text-muted-foreground">
													Affichée en premier
												</p>
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
											<field.InputGroupField
												type="number"
												step="0.01"
												placeholder="0.00"
											>
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
													<Package className="h-4 w-4 text-muted-foreground" />
													<InputGroupText className="text-xs text-muted-foreground">
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
									<div className="space-y-2">
										<Label htmlFor="primary-image-upload">
											Image principale
										</Label>
										<PrimaryImageUpload
											imageUrl={field.state.value?.url}
											mediaType={field.state.value?.mediaType}
											onRemove={() => field.handleChange(undefined)}
											skipUtapiDelete={true}
											renderUploadZone={() => (
												<div className="relative">
													<UploadDropzone
														endpoint="catalogMedia"
														onChange={async (files) => {
															if (files.length > 1) {
																toast.error(
																	"Tu ne peux uploader qu'une seule image principale"
																);
																return;
															}

															const file = files[0];
															const isVideo = file.type.startsWith("video/");

															if (isVideo) {
																toast.error(
																	"Les vidéos ne peuvent pas être utilisées comme média principal"
																);
																return;
															}

															const maxSize = 16 * 1024 * 1024;
															if (file.size > maxSize) {
																toast.error("L'image dépasse la limite de 16MB");
																return;
															}

															try {
																const res = await startPrimaryImageUpload(files);
																const serverData = res?.[0]?.serverData;
																if (serverData?.url) {
																	field.handleChange({
																		url: serverData.url,
																		blurDataUrl: serverData.blurDataUrl ?? undefined,
																		altText: product.title,
																		mediaType: "IMAGE",
																	});
																}
															} catch {
																toast.error("Échec de l'upload");
															}
														}}
														onUploadError={(error) => {
															toast.error(`Erreur: ${error.message}`);
														}}
														className="w-full *:after:hidden! *:before:hidden! [&>*::after]:hidden! [&>*::before]:hidden! ut-loading-text:!hidden ut-readying:!hidden ut-uploading:after:!hidden"
														appearance={{
															container: ({ isDragActive, isUploading }) => ({
																border: "3px dashed",
																borderColor: isDragActive
																	? "hsl(var(--primary))"
																	: "hsl(var(--muted-foreground) / 0.25)",
																borderRadius: "1rem",
																backgroundColor: isDragActive
																	? "hsl(var(--primary) / 0.05)"
																	: "hsl(var(--muted) / 0.3)",
																padding: "2rem",
																transition: "all 0.2s ease-in-out",
																height: "min(280px, 25vh)",
																minHeight: "220px",
																maxHeight: "350px",
																display: "flex",
																flexDirection: "column",
																alignItems: "center",
																justifyContent: "center",
																gap: "0.75rem",
																cursor: isUploading ? "not-allowed" : "pointer",
																opacity: isUploading ? 0.7 : 1,
																position: "relative",
																boxShadow: isDragActive
																	? "0 0 0 2px hsl(var(--primary) / 0.2), 0 8px 24px hsl(var(--primary) / 0.15)"
																	: "0 2px 8px rgba(0, 0, 0, 0.1)",
															}),
															uploadIcon: ({ isDragActive, isUploading }) => ({
																color: isDragActive
																	? "hsl(var(--primary))"
																	: "hsl(var(--primary) / 0.7)",
																width: "3.5rem",
																height: "3.5rem",
																transition: "all 0.2s ease-in-out",
																transform: isDragActive
																	? "scale(1.15)"
																	: "scale(1)",
																opacity: isUploading ? 0.5 : 1,
															}),
															label: ({ isDragActive, isUploading }) => ({
																color: isDragActive
																	? "hsl(var(--primary))"
																	: "hsl(var(--foreground))",
																fontSize: "1rem",
																fontWeight: "600",
																textAlign: "center",
																transition: "color 0.2s ease-in-out",
																opacity: isUploading ? 0.5 : 1,
																width: "100%",
																wordBreak: "break-word",
															}),
															allowedContent: ({ isUploading }) => ({
																color: "hsl(var(--muted-foreground))",
																fontSize: "0.875rem",
																textAlign: "center",
																marginTop: "0.5rem",
																opacity: isUploading ? 0.5 : 1,
															}),
														}}
														content={{
															uploadIcon: ({
																isDragActive,
																isUploading,
																uploadProgress,
															}) => {
																if (isUploading) {
																	return (
																		<div className="absolute inset-0 flex items-center justify-center bg-background/90 backdrop-blur-sm rounded-lg z-10">
																			<UploadProgress progress={uploadProgress} isProcessing={uploadProgress >= 100} />
																		</div>
																	);
																}
																return (
																	<Upload
																		className={cn(
																			"h-16 w-16 transition-all duration-200",
																			isDragActive
																				? "text-primary scale-110"
																				: "text-primary/70"
																		)}
																	/>
																);
															},
															label: ({ isDragActive, isUploading }) => {
																if (isUploading) {
																	return null;
																}

																if (isDragActive) {
																	return (
																		<div className="text-center">
																			<p className="text-lg font-semibold text-primary">
																				Relâchez pour uploader
																			</p>
																		</div>
																	);
																}

																return (
																	<div className="text-center space-y-2">
																		<p className="text-lg font-semibold">
																			Glisse ton image principale ici
																		</p>
																		<p className="text-sm text-muted-foreground">
																			ou clique pour sélectionner
																		</p>
																		<p className="text-xs text-muted-foreground mt-2">
																			Image • Max 16MB
																		</p>
																	</div>
																);
															},
															allowedContent: () => null,
															button: () => (
																<span className="sr-only">
																	Sélectionner une image principale
																</span>
															),
														}}
														config={{
															mode: "auto",
														}}
													/>
												</div>
											)}
										/>
									</div>
								)}
							</form.Field>

							{/* Galerie */}
							<form.Field name="galleryMedia" mode="array">
								{(field) => {
									const currentCount = field.state.value.length;
									const maxCount = 5;
									const isAtLimit = currentCount >= maxCount;

									return (
										<div className="space-y-3">
											<div className="flex items-center justify-between">
												<Label>Galerie (optionnel)</Label>
												<MediaCounterBadge count={currentCount} max={maxCount} />
											</div>

											{isAtLimit && (
												<div className="bg-secondary/10 border border-secondary rounded-lg p-3 flex items-start gap-2">
													<Info className="h-4 w-4 text-secondary-foreground mt-0.5 shrink-0" />
													<div className="text-sm text-secondary-foreground">
														<p className="font-medium">Limite atteinte</p>
														<p className="text-xs mt-0.5">
															Supprimez un média pour en ajouter un nouveau.
														</p>
													</div>
												</div>
											)}

											<AnimatePresence mode="popLayout">
												{field.state.value.length > 0 && (
													<motion.div
														initial={{ opacity: 0 }}
														animate={{ opacity: 1 }}
														exit={{ opacity: 0 }}
													>
														<MediaUploadGrid
															media={field.state.value.map(m => ({
																url: m.url,
																mediaType: m.mediaType,
																altText: m.altText ?? undefined,
																thumbnailUrl: m.thumbnailUrl ?? undefined,
																blurDataUrl: m.blurDataUrl ?? undefined,
															}))}
															onChange={(newMedia) => field.setValue(newMedia)}
															skipUtapiDelete={true}
														/>
													</motion.div>
												)}
											</AnimatePresence>

											{field.state.value.length === 0 && (
												<div className="flex items-center gap-3 py-3 px-3 text-left bg-muted/20 rounded-lg border border-dashed border-border">
													<ImagePlus className="h-6 w-6 text-muted-foreground/50 shrink-0" />
													<div>
														<p className="text-sm font-medium text-foreground">
															Aucun média
														</p>
														<p className="text-xs text-muted-foreground">
															Jusqu'à {maxCount} images et vidéos
														</p>
													</div>
												</div>
											)}

											{!isAtLimit && (
												<UploadDropzone
													endpoint="catalogMedia"
													onBeforeUploadBegin={(files) => {
														const remaining = maxCount - field.state.value.length;
														if (files.length > remaining) {
															toast.warning(
																`Seulement ${remaining} média${remaining > 1 ? "s" : ""} seront ajouté${remaining > 1 ? "s" : ""}`
															);
															return files.slice(0, remaining);
														}
														return files;
													}}
													onChange={async (files) => {
														const remaining = maxCount - field.state.value.length;
														const filesToUpload = files.slice(0, remaining);
														if (files.length > remaining) {
															toast.warning(
																`Seulement ${remaining} média${remaining > 1 ? "s" : ""} seront ajouté${remaining > 1 ? "s" : ""}`
															);
														}
														if (filesToUpload.length === 0) return;

														const results = await uploadGalleryMedia(filesToUpload);
														results.forEach((result) => {
															field.pushValue({
																url: result.url,
																blurDataUrl: result.blurDataUrl,
																thumbnailUrl: result.thumbnailUrl,
																altText: product.title,
																mediaType: result.mediaType,
															});
														});
													}}
													onUploadError={(error) => {
														toast.error(`Erreur: ${error.message}`);
													}}
													className="w-full *:after:hidden! *:before:hidden! [&>*::after]:hidden! [&>*::before]:hidden! ut-loading-text:!hidden ut-readying:!hidden ut-uploading:after:!hidden"
													appearance={{
														container: ({ isDragActive, isUploading }) => ({
															border: "2px dashed",
															borderColor: isDragActive
																? "hsl(var(--primary))"
																: "hsl(var(--muted-foreground) / 0.25)",
															borderRadius: "0.75rem",
															backgroundColor: isDragActive
																? "hsl(var(--primary) / 0.05)"
																: "hsl(var(--muted) / 0.3)",
															padding: "1rem",
															transition: "all 0.2s ease-in-out",
															height: "min(140px, 20vh)",
															minHeight: "120px",
															display: "flex",
															flexDirection: "column",
															alignItems: "center",
															justifyContent: "center",
															gap: "0.5rem",
															cursor: isUploading ? "not-allowed" : "pointer",
															opacity: isUploading ? 0.7 : 1,
															position: "relative",
															boxShadow: isDragActive
																? "0 0 0 1px hsl(var(--primary) / 0.2), 0 4px 12px hsl(var(--primary) / 0.1)"
																: "0 1px 3px rgba(0, 0, 0, 0.1)",
														}),
														uploadIcon: ({ isDragActive, isUploading }) => ({
															color: isDragActive
																? "hsl(var(--primary))"
																: "hsl(var(--primary) / 0.7)",
															width: "2rem",
															height: "2rem",
															transition: "all 0.2s ease-in-out",
															transform: isDragActive ? "scale(1.1)" : "scale(1)",
															opacity: isUploading ? 0.5 : 1,
														}),
														label: ({ isDragActive, isUploading }) => ({
															color: isDragActive
																? "hsl(var(--primary))"
																: "hsl(var(--foreground))",
															fontSize: "0.875rem",
															fontWeight: "500",
															textAlign: "center",
															transition: "color 0.2s ease-in-out",
															opacity: isUploading ? 0.5 : 1,
															width: "100%",
															wordBreak: "break-word",
														}),
														allowedContent: ({ isUploading }) => ({
															color: "hsl(var(--muted-foreground))",
															fontSize: "0.75rem",
															textAlign: "center",
															marginTop: "0.25rem",
															opacity: isUploading ? 0.5 : 1,
														}),
													}}
													content={{
														uploadIcon: ({
															isDragActive,
															isUploading,
															uploadProgress,
														}) => {
															if (isUploading) {
																return (
																	<div
																		className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg z-10"
																		role="status"
																		aria-live="polite"
																	>
																		<UploadProgress progress={uploadProgress} isProcessing={uploadProgress >= 100} />
																	</div>
																);
															}
															return (
																<Upload
																	className={cn(
																		"h-10 w-10 transition-all duration-200",
																		isDragActive
																			? "text-primary scale-110"
																			: "text-primary/70"
																	)}
																/>
															);
														},
														label: ({ isDragActive, isUploading }) => {
															if (isUploading) {
																return null;
															}

															if (isDragActive) {
																return (
																	<div className="text-center">
																		<p className="text-sm font-medium text-primary">
																			Relâchez pour ajouter
																		</p>
																	</div>
																);
															}

															const remaining = maxCount - field.state.value.length;
															return (
																<div className="text-center space-y-1">
																	<p className="text-sm font-medium">
																		Ajouter à la galerie
																	</p>
																	<p className="text-xs text-muted-foreground">
																		{remaining} {remaining > 1 ? "médias restants" : "média restant"} • Max 16MB (image) / 512MB (vidéo)
																	</p>
																</div>
															);
														},
														allowedContent: () => null,
														button: () => (
															<span className="sr-only">
																Sélectionner des images pour la galerie
															</span>
														),
													}}
													config={{
														mode: "auto",
													}}
												/>
											)}
										</div>
									);
								}}
							</form.Field>
					</div>

					{/* Footer */}
					<form.AppForm>
						<div className="mt-6">
							<div className="flex justify-between items-center gap-4">
								<Button
									type="button"
									variant="outline"
									onClick={() =>
										router.push(
											`/admin/catalogue/produits/${productSlug}/variantes`
										)
									}
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
											className="min-w-[160px]"
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
