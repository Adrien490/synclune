"use client";

import { FieldLabel, FormLayout, FormSection } from "@/shared/components/forms";
import { ImageCounterBadge } from "@/modules/products/components/image-counter-badge";
import { ImageGallery } from "@/modules/products/components/image-gallery";
import { PrimaryImageUpload } from "@/modules/products/components/primary-image-upload";
import { Button } from "@/shared/components/ui/button";
import { InputGroupAddon, InputGroupText } from "@/shared/components/ui/input-group";
import { Label } from "@/shared/components/ui/label";
import { TextShimmer } from "@/shared/components/ui/text-shimmer";
import { useUpdateProductSkuForm } from "@/modules/skus/hooks/admin/use-update-sku-form";
import type { SkuWithImages } from "@/modules/skus/data/get-sku";
import { cn } from "@/shared/utils/cn";
import { UploadDropzone, useUploadThing } from "@/shared/utils/uploadthing";
import { AnimatePresence, motion } from "framer-motion";
import { Euro, ImagePlus, Package, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

interface EditProductVariantFormProps {
	colors: Array<{
		id: string;
		name: string;
		hex: string;
	}>;
	product: {
		id: string;
		title: string;
	};
	productSlug: string;
	sku: SkuWithImages;
}

export function EditProductVariantForm({
	colors,
	product,
	productSlug,
	sku,
}: EditProductVariantFormProps) {
	const router = useRouter();
	const [uploadStatus, setUploadStatus] = useState<string>("");

	const {
		startUpload: startPrimaryImageUpload,
		isUploading: isPrimaryImageUploading,
	} = useUploadThing("catalogMedia", {
		onUploadBegin: () => {
			setUploadStatus("Upload du média principal en cours...");
		},
		onUploadProgress: (progress) => {
			setUploadStatus(`Upload du média principal : ${progress}%`);
		},
		onClientUploadComplete: () => {
			setUploadStatus("Upload du média principal terminé avec succès");
			setTimeout(() => setUploadStatus(""), 2000);
		},
	});

	const { startUpload: startGalleryUpload, isUploading: isGalleryUploading } =
		useUploadThing("catalogMedia", {
			onUploadBegin: () => {
				setUploadStatus("Upload des médias de galerie en cours...");
			},
			onUploadProgress: (progress) => {
				setUploadStatus(`Upload de la galerie : ${progress}%`);
			},
			onClientUploadComplete: () => {
				setUploadStatus("Upload de la galerie terminé avec succès");
				setTimeout(() => setUploadStatus(""), 2000);
			},
		});

	const { form, action } = useUpdateProductSkuForm({
		sku,
		onSuccess: (message) => {
			toast.success(message || "Variante mise à jour avec succès", {
				action: {
					label: "Voir les variantes",
					onClick: () =>
						router.push(`/admin/catalogue/produits/${productSlug}/variantes`),
				},
			});
			setTimeout(() => {
				router.push(`/admin/catalogue/produits/${productSlug}/variantes`);
			}, 2000);
		},
	});

	return (
		<>
			{/* Zone d'annonce pour les lecteurs d'écran */}
			<div
				role="status"
				aria-live="polite"
				aria-atomic="true"
				className="sr-only"
			>
				{uploadStatus}
			</div>

			<fieldset
				disabled={
					isPrimaryImageUploading || isGalleryUploading || form.state.isSubmitting
				}
				className="space-y-6"
			>
				<form
					action={action}
					className="space-y-6 pb-24 sm:pb-28 lg:pb-24"
					onSubmit={() => {
						void form.handleSubmit();
					}}
				>
					{/* Champ caché pour le skuId */}
					<input type="hidden" name="skuId" value={sku.id} />

					{/* Champs cachés pour l'image principale */}
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

					{/* Champs cachés pour la galerie */}
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

					{/* Erreurs globales */}
					<form.AppForm>
						<form.FormErrorDisplay />
					</form.AppForm>

					{/* SECTIONS */}
					<FormLayout cols={2}>
						{/* Image principale */}
						<FormSection
							title="Média principal"
							description="Image principale de cette variante"
						>
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
																	"Vous ne pouvez uploader qu'une seule image principale"
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

															const maxSize = 4 * 1024 * 1024;
															if (file.size > maxSize) {
																toast.error("L'image dépasse la limite de 4MB");
																return;
															}

															try {
																const res = await startPrimaryImageUpload(files);
																const imageUrl = res?.[0]?.serverData?.url;
																if (imageUrl) {
																	field.handleChange({
																		url: imageUrl,
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
																		<div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/90 backdrop-blur-sm rounded-lg z-10">
																			<div className="text-center">
																				<TextShimmer
																					className="text-base font-semibold"
																					duration={1.5}
																				>
																					Upload en cours...
																				</TextShimmer>
																				<p className="text-2xl font-bold text-primary mt-2">
																					{uploadProgress}%
																				</p>
																			</div>
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
																			Glissez votre image principale ici
																		</p>
																		<p className="text-sm text-muted-foreground">
																			ou cliquez pour sélectionner
																		</p>
																		<p className="text-xs text-muted-foreground mt-2">
																			Image • Max 4MB
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
						</FormSection>

						{/* Informations de base */}
						<FormSection
							title="Informations de base"
							description="Détails de la variante"
						>
								{/* Couleur */}
							<form.AppField name="colorId">
								{(field) => (
									<div className="space-y-2">
										<FieldLabel optional>Couleur</FieldLabel>
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
										/>
									</div>
								)}
							</form.AppField>

							{/* Matériau + Taille */}
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<form.AppField name="material">
									{(field) => (
										<div className="space-y-2">
											<FieldLabel optional>Matériau</FieldLabel>
											<field.InputGroupField />
										</div>
									)}
								</form.AppField>

								<form.AppField name="size">
									{(field) => (
										<div className="space-y-2">
											<FieldLabel optional>Taille</FieldLabel>
											<field.InputGroupField />
										</div>
									)}
								</form.AppField>
							</div>
						</FormSection>
					</FormLayout>

					{/* Prix et stock */}
					<FormLayout cols={2}>
						<FormSection title="Prix" description="Configuration des prix">
							{/* Prix TTC */}
							<form.AppField
								name="priceInclTaxEuros"
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
										<FieldLabel required>Prix TTC</FieldLabel>
										<field.InputGroupField
											type="number"
											step="0.01"
											required
											placeholder="0.00"
										>
											<InputGroupAddon>
												<Euro className="h-4 w-4" />
											</InputGroupAddon>
											<InputGroupAddon align="inline-end">
												<InputGroupText className="text-xs text-muted-foreground">
													TTC
												</InputGroupText>
											</InputGroupAddon>
										</field.InputGroupField>
									</div>
								)}
							</form.AppField>

							{/* Prix comparé */}
							<form.AppField name="compareAtPriceEuros">
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
						</FormSection>

						<FormSection
							title="Disponibilité"
							description="Stock et statut"
						>
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

							{/* Actif */}
							<form.AppField name="isActive">
								{(field) => (
									<div className="space-y-2">
										<FieldLabel required>Statut</FieldLabel>
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

							{/* Par défaut */}
							<form.AppField name="isDefault">
								{(field) => (
									<div className="space-y-2">
										<FieldLabel optional>Variante par défaut</FieldLabel>
										<field.CheckboxField label="Définir comme variante par défaut" />
										<p className="text-xs text-muted-foreground">
											La variante par défaut sera affichée en premier
										</p>
									</div>
								)}
							</form.AppField>
						</FormSection>
					</FormLayout>

					{/* Galerie */}
					<FormLayout cols={1}>
						<FormSection
							title="Galerie d'images"
							description="Images supplémentaires (max 10)"
						>
							<form.Field name="galleryMedia" mode="array">
								{(field) => {
									const currentCount = field.state.value.length;
									const maxCount = 10;
									const isAtLimit = currentCount >= maxCount;

									return (
										<div className="space-y-4">
											<div className="flex items-center justify-between">
												<div className="flex items-center gap-2 text-sm text-muted-foreground">
													<ImagePlus className="h-4 w-4" />
													<span className="font-medium">
														{currentCount} / {maxCount} médias
													</span>
												</div>
												<ImageCounterBadge count={currentCount} max={maxCount} />
											</div>

											{isAtLimit && (
												<div className="bg-secondary/10 border border-secondary rounded-lg p-3">
													<p className="text-sm text-secondary-foreground">
														Limite de {maxCount} médias atteinte
													</p>
												</div>
											)}

											<AnimatePresence mode="popLayout">
												{field.state.value.length > 0 && (
													<motion.div
														initial={{ opacity: 0 }}
														animate={{ opacity: 1 }}
														exit={{ opacity: 0 }}
													>
														<ImageGallery
															images={field.state.value}
															onRemove={(index) => field.removeValue(index)}
															skipUtapiDelete={true}
														/>
													</motion.div>
												)}
											</AnimatePresence>

											{!isAtLimit && (
												<UploadDropzone
													endpoint="catalogMedia"
													onChange={async (files) => {
														const remaining = maxCount - field.state.value.length;
														let filesToUpload = files.slice(0, remaining);

														if (files.length > remaining) {
															toast.warning(
																`Seulement ${remaining} média${remaining > 1 ? "s" : ""} ajouté${remaining > 1 ? "s" : ""}`
															);
														}

														const fileTypeMap = new Map(
															filesToUpload.map((f) => [
																f.name,
																f.type.startsWith("video/") ? "VIDEO" : "IMAGE",
															])
														);

														try {
															const res = await startGalleryUpload(filesToUpload);

															res?.forEach((uploadResult, index) => {
																const imageUrl = uploadResult?.serverData?.url;
																if (imageUrl) {
																	const originalFile = filesToUpload[index];
																	field.pushValue({
																		url: imageUrl,
																		altText: product.title,
																		mediaType:
																			(fileTypeMap.get(originalFile.name) as
																				| "IMAGE"
																				| "VIDEO"
																				| undefined) || "IMAGE",
																	});
																}
															});
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
															border: "2px dashed",
															borderColor: isDragActive
																? "hsl(var(--primary))"
																: "hsl(var(--muted-foreground) / 0.25)",
															borderRadius: "0.75rem",
															backgroundColor: isDragActive
																? "hsl(var(--primary) / 0.05)"
																: "hsl(var(--muted) / 0.3)",
															padding: "1.5rem",
															transition: "all 0.2s ease-in-out",
															height: "min(180px, 30vh)",
															minHeight: "150px",
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
															width: "2.5rem",
															height: "2.5rem",
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
																		className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/80 backdrop-blur-sm rounded-lg z-10"
																		role="status"
																		aria-live="polite"
																	>
																		<div className="text-center">
																			<TextShimmer
																				className="text-sm font-medium"
																				duration={1.5}
																			>
																				Ajout en cours...
																			</TextShimmer>
																			<p className="text-lg font-semibold text-primary mt-1">
																				{uploadProgress}%
																			</p>
																		</div>
																	</div>
																);
															}
															return (
																<Upload
																	className={cn(
																		"h-12 w-12 transition-all duration-200",
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
																<div className="text-center space-y-1.5">
																	<p className="text-sm font-medium">
																		Ajouter à la galerie
																	</p>
																	<p className="text-xs text-muted-foreground">
																		{remaining} {remaining > 1 ? "médias" : "média"}{" "}
																		{remaining > 1 ? "restants" : "restant"}
																	</p>
																	<p className="text-xs text-muted-foreground">
																		Max 4MB (image) / 512MB (vidéo)
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
						</FormSection>
					</FormLayout>

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
												? "Mise à jour..."
												: isPrimaryImageUploading
													? "Upload image..."
													: isGalleryUploading
														? "Upload galerie..."
														: "Mettre à jour"}
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
