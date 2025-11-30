"use client";

import { FieldLabel, FormLayout, FormSection } from "@/shared/components/forms";
import { ImageCounterBadge } from "@/modules/medias/components/image-counter-badge";
import { ImageGallery } from "@/modules/medias/components/admin/image-gallery";
import { PrimaryImageUpload } from "@/modules/medias/components/admin/primary-image-upload";
import { useAutoVideoThumbnail } from "@/modules/medias/hooks/use-auto-video-thumbnail";
import { Button } from "@/shared/components/ui/button";
import { InputGroupAddon, InputGroupText } from "@/shared/components/ui/input-group";
import { Label } from "@/shared/components/ui/label";
import { TextShimmer } from "@/shared/components/ui/text-shimmer";
import { MultiSelect } from "@/shared/components/multi-select";
import { useCreateProductForm } from "@/modules/products/hooks/use-create-product-form";
import { cn } from "@/shared/utils/cn";
import { UploadDropzone, useUploadThing } from "@/modules/medias/utils/uploadthing";
import { AnimatePresence, motion } from "framer-motion";
import { Euro, ImagePlus, Info, Package, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface CreateProductFormProps {
	productTypes: Array<{
		id: string;
		label: string;
		slug: string;
		isActive: boolean;
	}>;
	collections: Array<{
		id: string;
		name: string;
		slug: string;
	}>;
	colors: Array<{
		id: string;
		name: string;
		hex: string;
	}>;
	materials: Array<{
		id: string;
		name: string;
	}>;
}

export function CreateProductForm({
	productTypes,
	collections,
	colors,
	materials,
}: CreateProductFormProps) {
	const router = useRouter();

	// Hook pour génération automatique de thumbnail vidéo
	const { generateThumbnail, generatingUrls } = useAutoVideoThumbnail();

	const {
		startUpload: startPrimaryImageUpload,
		isUploading: isPrimaryImageUploading,
	} = useUploadThing("catalogMedia");
	const { startUpload: startGalleryUpload, isUploading: isGalleryUploading } =
		useUploadThing("catalogMedia");

	const { form, action, isPending } = useCreateProductForm({
		onSuccess: (message) => {
			toast.success(message || "Bijou créé avec succès", {
				action: {
					label: "Voir les bijoux",
					onClick: () => router.push("/admin/catalogue/produits"),
				},
			});
			form.reset();
		},
	});

	return (
		<form
			action={action}
			className="space-y-6 pb-32"
			onSubmit={() => {
				void form.handleSubmit();
			}}
		>
			{/* Champs cachés pour sérialiser l'image principale */}
			<form.Subscribe
				selector={(state) => [state.values.initialSku.primaryImage]}
			>
				{([primaryImage]) =>
					primaryImage ? (
						<input
							type="hidden"
							name="initialSku.primaryImage"
							value={JSON.stringify(primaryImage)}
						/>
					) : null
				}
			</form.Subscribe>

			{/* Champs cachés pour sérialiser la galerie de médias */}
			<form.Subscribe
				selector={(state) => [state.values.initialSku.galleryMedia]}
			>
				{([galleryMedia]) =>
					galleryMedia && galleryMedia.length > 0 ? (
						<input
							type="hidden"
							name="initialSku.galleryMedia"
							value={JSON.stringify(galleryMedia)}
						/>
					) : null
				}
			</form.Subscribe>

			{/* Champ caché pour le status */}
			<form.Subscribe selector={(state) => [state.values.status]}>
				{([status]) => <input type="hidden" name="status" value={status} />}
			</form.Subscribe>

			{/* Champ caché pour les collections (many-to-many) */}
			<form.Subscribe selector={(state) => [state.values.collectionIds]}>
				{([collectionIds]) => (
					<input
						type="hidden"
						name="collectionIds"
						value={JSON.stringify(collectionIds || [])}
					/>
				)}
			</form.Subscribe>

			{/* Erreurs globales du formulaire */}
			<form.AppForm>
				<form.FormErrorDisplay />
			</form.AppForm>

			{/* ═══════════════════════════════════════════════════════════════════════
			    SECTION 1 : Le bijou + SECTION 2 : Prix et stock
			    ═══════════════════════════════════════════════════════════════════════ */}
			<FormLayout cols={2}>
				{/* SECTION 1 : Le bijou */}
				<FormSection
					title="Le bijou"
					description="Informations et caractéristiques de votre création"
				>
					{/* Titre */}
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
								<FieldLabel required>Titre du bijou</FieldLabel>
								<field.InputField label="" required autoFocus />
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
							<div className="space-y-2">
								<FieldLabel optional>Description</FieldLabel>
								<field.TextareaGroupField rows={3}>
									<InputGroupAddon align="block-end">
										<InputGroupText
											className={cn(
												"text-xs ml-auto",
												(field.state.value?.length || 0) > 500
													? "text-destructive"
													: "text-muted-foreground"
											)}
										>
											{field.state.value?.length || 0} / 500 caractères
										</InputGroupText>
									</InputGroupAddon>
								</field.TextareaGroupField>
							</div>
						)}
					</form.AppField>

					{/* Type de bijou + Collection */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<form.AppField name="typeId">
							{(field) => (
								<div className="space-y-2">
									<FieldLabel optional>Type de bijou</FieldLabel>
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
					<form.AppField name="initialSku.colorId">
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
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<form.AppField name="initialSku.materialId">
							{(field) => (
								<div className="space-y-2">
									<FieldLabel optional>Matériau</FieldLabel>
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

						<form.AppField name="initialSku.size">
							{(field) => (
								<div className="space-y-2">
									<FieldLabel optional>Taille</FieldLabel>
									<field.InputGroupField placeholder="Ex: 52, Ajustable, 18cm..." />
								</div>
							)}
						</form.AppField>
					</div>

					{/* Statut de publication */}
					<form.AppField name="status">
						{(field) => (
							<div className="space-y-2">
								<FieldLabel required>Statut</FieldLabel>
								<field.RadioGroupField
									label=""
									options={[
										{ value: "DRAFT", label: "Brouillon" },
										{ value: "PUBLIC", label: "Public" },
									]}
								/>
								<p className="text-xs text-muted-foreground">
									Les brouillons ne sont pas visibles sur la boutique
								</p>
							</div>
						)}
					</form.AppField>
				</FormSection>

				{/* SECTION 2 : Prix et stock */}
				<FormSection
					title="Prix et stock"
					description="Tarification et disponibilité"
				>
					{/* Prix de vente */}
					<form.AppField
						name="initialSku.priceInclTaxEuros"
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
								<FieldLabel required>Prix de vente TTC</FieldLabel>
								<field.InputGroupField type="number" step="0.01" required>
									<InputGroupAddon>
										<Euro className="h-4 w-4" />
									</InputGroupAddon>
									<InputGroupAddon align="inline-end">
										<InputGroupText className="text-xs text-muted-foreground">
											TTC
										</InputGroupText>
									</InputGroupAddon>
								</field.InputGroupField>
								<p className="text-xs text-muted-foreground">
									Le prix que paiera le client (taxes comprises)
								</p>
							</div>
						)}
					</form.AppField>

					{/* Prix comparé (avant réduction) */}
					<form.AppField
						name="initialSku.compareAtPriceEuros"
						validators={{
							onChangeListenTo: ["initialSku.priceInclTaxEuros"],
							onChange: ({ value, fieldApi }) => {
								if (!value) return undefined;
								const price = fieldApi.form.getFieldValue(
									"initialSku.priceInclTaxEuros"
								);
								if (price && value < price) {
									return "Le prix comparé doit être supérieur ou égal au prix de vente";
								}
							},
							onBlur: ({ value, fieldApi }) => {
								if (!value) return undefined;
								const price = fieldApi.form.getFieldValue(
									"initialSku.priceInclTaxEuros"
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
								<field.InputGroupField type="number" step="0.01">
									<InputGroupAddon>
										<Euro className="h-4 w-4" />
									</InputGroupAddon>
									<InputGroupAddon align="inline-end">
										<InputGroupText className="text-xs text-muted-foreground">
											TTC
										</InputGroupText>
									</InputGroupAddon>
								</field.InputGroupField>
								<p className="text-xs text-muted-foreground">
									Si renseigné, le prix de vente sera affiché comme une promotion
								</p>
							</div>
						)}
					</form.AppField>

					{/* Stock */}
					<form.AppField name="initialSku.inventory">
						{(field) => (
							<div className="space-y-2">
								<FieldLabel optional>Quantité en stock</FieldLabel>
								<field.InputGroupField type="number" min={0}>
									<InputGroupAddon align="inline-end">
										<Package className="h-4 w-4 text-muted-foreground" />
										<InputGroupText className="text-xs text-muted-foreground">
											unités
										</InputGroupText>
									</InputGroupAddon>
								</field.InputGroupField>
								<p className="text-xs text-muted-foreground">
									Laissez vide ou 0 si le bijou est en rupture
								</p>
							</div>
						)}
					</form.AppField>
				</FormSection>
			</FormLayout>

			{/* ═══════════════════════════════════════════════════════════════════════
			    SECTION 3 : Visuels (pleine largeur)
			    ═══════════════════════════════════════════════════════════════════════ */}
			<FormSection
				title="Visuels"
				description="Image principale et galerie de médias"
			>
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{/* Image principale */}
					<form.Field
						name="initialSku.primaryImage"
						validators={{
							onBlur: ({ value }) => {
								if (!value) {
									return "L'image principale est requise";
								}
							},
							onSubmit: ({ value }) => {
								if (!value) {
									return "L'image principale est requise";
								}
							},
						}}
					>
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor="primary-image-upload">
									Image principale <span className="text-destructive">*</span>
								</Label>
								<p className="text-xs text-muted-foreground">
									⚠️ Les vidéos ne peuvent pas être utilisées comme média
									principal.
								</p>
								<PrimaryImageUpload
									imageUrl={field.state.value?.url}
									mediaType={field.state.value?.mediaType}
									onRemove={() => field.handleChange(undefined)}
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
															"Les vidéos ne peuvent pas être utilisées comme média principal. Veuillez uploader une image (JPG, PNG, WebP, GIF ou AVIF)."
														);
														return;
													}

													const maxSize = 4 * 1024 * 1024;
													if (file.size > maxSize) {
														const sizeMB = (file.size / 1024 / 1024).toFixed(2);
														toast.error(
															`L'image dépasse la limite de 4MB (${sizeMB}MB)`
														);
														return;
													}

													try {
														const res = await startPrimaryImageUpload(files);
														const imageUrl = res?.[0]?.serverData?.url;
														if (imageUrl) {
															field.handleChange({
																url: imageUrl,
																altText: form.state.values.title || undefined,
																mediaType: "IMAGE",
															});
														}
													} catch {
														toast.error(
															"Échec de l'upload de l'image principale",
															{
																action: {
																	label: "Réessayer",
																	onClick: async () => {
																		try {
																			const res =
																				await startPrimaryImageUpload(files);
																			const imageUrl =
																				res?.[0]?.serverData?.url;
																			if (imageUrl) {
																				field.handleChange({
																					url: imageUrl,
																					altText:
																						form.state.values.title ||
																						undefined,
																					mediaType: "IMAGE",
																				});
																				toast.success(
																					"Image uploadée avec succès"
																				);
																			}
																		} catch {
																			toast.error("Échec du nouvel essai");
																		}
																	},
																},
															}
														);
													}
												}}
												onUploadError={(error) => {
													toast.error(`Erreur: ${error.message}`);
												}}
												className="w-full *:after:hidden! *:before:hidden! [&>*::after]:hidden! [&>*::before]:hidden! ut-loading-text:!hidden ut-readying:!hidden ut-uploading:after:!hidden"
												aria-label="Zone d'upload de l'image principale"
												aria-required="true"
												aria-invalid={field.state.meta.errors.length > 0}
												aria-describedby={
													field.state.meta.errors.length > 0
														? "primary-image-error"
														: "primary-image-hint"
												}
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
																	{/* Barre de progression visuelle */}
																	<div className="w-3/4 h-2 bg-muted rounded-full overflow-hidden">
																		<div
																			className="h-full bg-primary transition-all duration-300 ease-out"
																			style={{ width: `${uploadProgress}%` }}
																		/>
																	</div>
																	<div className="text-center">
																		<TextShimmer
																			className="text-base font-semibold"
																			duration={1.5}
																		>
																			{`Upload en cours... ${uploadProgress}%`}
																		</TextShimmer>
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
											{field.state.meta.errors.length > 0 && (
												<ul
													id="primary-image-error"
													className="text-sm text-destructive mt-2 text-center list-none space-y-1"
													role="alert"
												>
													{field.state.meta.errors.map((error, i) => (
														<li key={i}>{error}</li>
													))}
												</ul>
											)}
										</div>
									)}
								/>
								<p
									id="primary-image-hint"
									className="text-sm md:text-xs text-muted-foreground"
								>
									Format carré • 1200x1200px min • Max 4MB
								</p>
							</div>
						)}
					</form.Field>

					{/* Galerie */}
					<form.Field name="initialSku.galleryMedia" mode="array">
						{(field) => {
							const currentCount = field.state.value.length;
							const maxCount = 10;
							const isAtLimit = currentCount >= maxCount;

							return (
								<div className="space-y-3">
									<div className="flex items-center justify-between">
										<Label>Galerie (optionnel)</Label>
										<ImageCounterBadge count={currentCount} max={maxCount} />
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
												className="mb-3"
												role="region"
												aria-label="Galerie d'images"
											>
												<ImageGallery
													images={field.state.value}
													onRemove={(index) => field.removeValue(index)}
													generatingThumbnails={generatingUrls}
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
											onChange={async (files) => {
												const remaining = maxCount - field.state.value.length;
												let filesToUpload = files.slice(0, remaining);

												if (files.length > remaining) {
													toast.warning(
														`Seulement ${remaining} média${remaining > 1 ? "s" : ""} ${remaining > 1 ? "ont" : "a"} été ajouté${remaining > 1 ? "s" : ""}`
													);
												}

												const fileTypeMap = new Map(
													filesToUpload.map((f) => [
														f.name,
														f.type.startsWith("video/") ? "VIDEO" : "IMAGE",
													])
												);

												const oversizedFiles = filesToUpload.filter((f) => {
													const maxSize = f.type.startsWith("video/")
														? 512 * 1024 * 1024
														: 4 * 1024 * 1024;
													return f.size > maxSize;
												});
												if (oversizedFiles.length > 0) {
													toast.error(
														`${oversizedFiles.length} média(s) dépassent la limite`,
														{
															description: oversizedFiles
																.map(
																	(f) =>
																		`${f.name}: ${(f.size / 1024 / 1024).toFixed(2)}MB`
																)
																.join(", "),
														}
													);
													filesToUpload = filesToUpload.filter((f) => {
														const maxSize = f.type.startsWith("video/")
															? 512 * 1024 * 1024
															: 4 * 1024 * 1024;
														return f.size <= maxSize;
													});
													if (filesToUpload.length === 0) {
														return;
													}
												}

												try {
													const res = await startGalleryUpload(filesToUpload);

													res?.forEach((uploadResult, index) => {
														const imageUrl = uploadResult?.serverData?.url;
														if (imageUrl) {
															const originalFile = filesToUpload[index];
															const mediaType =
																(fileTypeMap.get(originalFile.name) as
																	| "IMAGE"
																	| "VIDEO"
																	| undefined) || "IMAGE";

															const newMediaIndex = field.state.value.length;
															const newMedia = {
																url: imageUrl,
																altText: form.state.values.title || undefined,
																mediaType,
															};
															field.pushValue(newMedia);

															// Si c'est une vidéo, générer thumbnail automatiquement en arrière-plan
															if (mediaType === "VIDEO") {
																generateThumbnail(imageUrl).then((result) => {
																	if (result.mediumUrl) {
																		field.replaceValue(newMediaIndex, {
																			...newMedia,
																			thumbnailUrl: result.mediumUrl,
																			thumbnailSmallUrl: result.smallUrl,
																		});
																	}
																});
															}
														}
													});
												} catch {
													toast.error("Échec de l'upload des médias", {
														action: {
															label: "Réessayer",
															onClick: async () => {
																try {
																	const res =
																		await startGalleryUpload(filesToUpload);
																	res?.forEach((uploadResult, index) => {
																		const imageUrl =
																			uploadResult?.serverData?.url;
																		if (imageUrl) {
																			const originalFile = filesToUpload[index];
																			const mediaType =
																				(fileTypeMap.get(
																					originalFile.name
																				) as "IMAGE" | "VIDEO" | undefined) ||
																				"IMAGE";

																			const newMediaIndex = field.state.value.length;
																			const newMedia = {
																				url: imageUrl,
																				altText:
																					form.state.values.title || undefined,
																				mediaType,
																			};
																			field.pushValue(newMedia);

																			// Si c'est une vidéo, générer thumbnail automatiquement
																			if (mediaType === "VIDEO") {
																				generateThumbnail(imageUrl).then((result) => {
																					if (result.mediumUrl) {
																						field.replaceValue(newMediaIndex, {
																							...newMedia,
																							thumbnailUrl: result.mediumUrl,
																							thumbnailSmallUrl: result.smallUrl,
																						});
																					}
																				});
																			}
																		}
																	});
																	toast.success("Médias ajoutés avec succès");
																} catch {
																	toast.error("Échec du nouvel essai");
																}
															},
														},
													});
												}
											}}
											onUploadError={(error) => {
												toast.error(`Erreur: ${error.message}`);
											}}
											className="w-full *:after:hidden! *:before:hidden! [&>*::after]:hidden! [&>*::before]:hidden! ut-loading-text:!hidden ut-readying:!hidden ut-uploading:after:!hidden"
											aria-label="Zone d'upload pour la galerie d'images"
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
																{remaining} {remaining > 1 ? "médias restants" : "média restant"} • Max 4MB (image) / 512MB (vidéo)
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
			</FormSection>

			{/* Footer avec bouton d'action */}
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
										isPrimaryImageUploading ||
										isGalleryUploading ||
										generatingUrls.size > 0
									}
									className="min-w-[160px]"
								>
									{isPending
										? "Enregistrement..."
										: isPrimaryImageUploading
											? "Upload image principale..."
											: isGalleryUploading
												? "Upload galerie..."
												: generatingUrls.size > 0
													? "Génération miniatures..."
													: "Créer le bijou"}
								</Button>
							)}
						</form.Subscribe>
					</div>
				</div>
			</form.AppForm>

		</form>
	);
}
