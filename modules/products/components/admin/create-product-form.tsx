"use client";

import { FieldLabel, FormLayout, FormSection } from "@/shared/components/forms";
import { ImageCounterBadge } from "@/modules/products/components/image-counter-badge";
import { ImageGallery } from "@/modules/products/components/image-gallery";
import { PrimaryImageUpload } from "@/modules/products/components/primary-image-upload";
import { Button } from "@/shared/components/ui/button";
import { InputGroupAddon, InputGroupText } from "@/shared/components/ui/input-group";
import { Label } from "@/shared/components/ui/label";
import { TextShimmer } from "@/shared/components/ui/text-shimmer";
import { useCreateProductForm } from "@/modules/products/hooks/admin/use-create-product-form";
import { cn } from "@/shared/utils/cn";
import { UploadDropzone, useUploadThing } from "@/shared/utils/uploadthing";
import { AnimatePresence, motion } from "framer-motion";
import { Euro, ImagePlus, Package, Upload } from "lucide-react";
import Link from "next/link";
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
}

export function CreateProductForm({
	productTypes,
	collections,
	colors,
}: CreateProductFormProps) {
	const router = useRouter();

	const {
		startUpload: startPrimaryImageUpload,
		isUploading: isPrimaryImageUploading,
	} = useUploadThing("catalogMedia");
	const { startUpload: startGalleryUpload, isUploading: isGalleryUploading } =
		useUploadThing("catalogMedia");

	const { form, action, isPending } = useCreateProductForm({
		onSuccess: (message) => {
			// Afficher un toast personnalisé avec bouton d'action
			toast.success(message || "Bijou créé avec succès", {
				action: {
					label: "Voir les bijoux",
					onClick: () => router.push("/admin/catalogue/produits"),
				},
			});
			// Réinitialiser le formulaire après succès
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

			{/* Erreurs globales du formulaire */}
			<form.AppForm>
				<form.FormErrorDisplay />
			</form.AppForm>

			{/* SECTIONS 1 & 2 : Image principale + Informations générales côte à côte */}
			<FormLayout cols={2}>
				{/* SECTION 1 : Média principal */}
				<FormSection
					title="Média principal"
					description="L'image principale qui représentera votre bijou dans les listings et résultats de recherche"
				>
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
									principal. Ajoutez-les à la galerie.
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

													// VALIDATION: Bloquer les vidéos pour le média principal
													if (isVideo) {
														toast.error(
															"Les vidéos ne peuvent pas être utilisées comme média principal. Veuillez uploader une image (JPG, PNG, WebP, GIF ou AVIF)."
														);
														return;
													}

													// Validation de la taille (4MB pour images)
													const maxSize = 4 * 1024 * 1024; // 4MB
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
																mediaType: "IMAGE", // Toujours IMAGE pour le principal
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
																					mediaType: "IMAGE", // Toujours IMAGE
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
											{field.state.meta.errors.length > 0 && (
												<p
													id="primary-image-error"
													className="text-sm text-destructive mt-2 text-center"
													role="alert"
												>
													{field.state.meta.errors.join(", ")}
												</p>
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
				</FormSection>

				{/* SECTION 2 : Informations générales */}
				<FormSection
					title="Informations générales"
					description="Renseignez les informations de base du bijou"
				>
					{/* Titre */}
					<form.AppField
						name="title"
						validators={{
							onChange: ({ value }: { value: string }) => {
								if (!value || value.trim().length < 2) {
									return "Le titre doit contenir au moins 2 caractères";
								}
							},
							onBlur: ({ value }) => {
								if (!value || value.trim().length < 2) {
									return "Le titre doit contenir au moins 2 caractères";
								}
							},
							onSubmit: ({ value }) => {
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
					<form.AppField name="description">
						{(field) => (
							<div className="space-y-2">
								<FieldLabel optional>Description</FieldLabel>
								<field.TextareaGroupField rows={3}>
									<InputGroupAddon align="block-end">
										<InputGroupText className="text-xs text-muted-foreground ml-auto">
											{field.state.value?.length || 0} / 5000 caractères
										</InputGroupText>
									</InputGroupAddon>
								</field.TextareaGroupField>
							</div>
						)}
					</form.AppField>

					{/* Type de bijou + Collection en 2 colonnes */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						{/* Type de bijou */}
						<form.AppField name="typeId">
							{(field) => (
								<div className="space-y-2">
									<FieldLabel optional>Type de bijou</FieldLabel>
									<div className="flex gap-2">
										<div className="flex-1">
											<field.SelectField
												label=""
												options={productTypes.map((type) => ({
													value: type.id,
													label: type.label,
												}))}
												placeholder="Sélectionner un type"
											/>
										</div>
										{field.state.value && (
											<Button
												type="button"
												variant="outline"
												size="icon"
												onClick={() => field.handleChange(undefined)}
												aria-label="Effacer le type de bijou"
												className="h-9 w-9 shrink-0 cursor-pointer"
											>
												<svg
													xmlns="http://www.w3.org/2000/svg"
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													strokeWidth="2"
													strokeLinecap="round"
													strokeLinejoin="round"
													className="h-4 w-4"
												>
													<path d="M18 6 6 18" />
													<path d="m6 6 12 12" />
												</svg>
											</Button>
										)}
									</div>
								</div>
							)}
						</form.AppField>

						{/* Collection */}
						<form.AppField name="collectionId">
							{(field) => (
								<div className="space-y-2">
									<FieldLabel optional>Collection</FieldLabel>
									<div className="flex gap-2">
										<div className="flex-1">
											<field.SelectField
												label=""
												options={collections.map((col) => ({
													value: col.id,
													label: col.name,
												}))}
												placeholder="Sélectionner une collection"
											/>
										</div>
										{field.state.value && (
											<Button
												type="button"
												variant="outline"
												size="icon"
												onClick={() => field.handleChange(undefined)}
												aria-label="Effacer la collection"
												className="h-9 w-9 shrink-0 cursor-pointer"
											>
												<svg
													xmlns="http://www.w3.org/2000/svg"
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													strokeWidth="2"
													strokeLinecap="round"
													strokeLinejoin="round"
													className="h-4 w-4"
												>
													<path d="M18 6 6 18" />
													<path d="m6 6 12 12" />
												</svg>
											</Button>
										)}
									</div>
								</div>
							)}
						</form.AppField>
					</div>

					{/* Couleur + Matériau + Taille en grille */}
					<div className="space-y-6">
						{/* Couleur */}
						<form.AppField name="initialSku.colorId">
							{(field) => (
								<div className="space-y-2">
									<FieldLabel optional>Couleur</FieldLabel>
									<div className="flex gap-2">
										<div className="flex-1">
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
											/>
										</div>
										{field.state.value && (
											<Button
												type="button"
												variant="outline"
												size="icon"
												onClick={() => field.handleChange("")}
												aria-label="Effacer la couleur"
												className="h-9 w-9 shrink-0 cursor-pointer"
											>
												<svg
													xmlns="http://www.w3.org/2000/svg"
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													strokeWidth="2"
													strokeLinecap="round"
													strokeLinejoin="round"
													className="h-4 w-4"
												>
													<path d="M18 6 6 18" />
													<path d="m6 6 12 12" />
												</svg>
											</Button>
										)}
									</div>
								</div>
							)}
						</form.AppField>

						{/* Matériau + Taille en 2 colonnes */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							{/* Matériau */}
							<form.AppField name="initialSku.material">
								{(field) => (
									<div className="space-y-2">
										<FieldLabel optional>Matériau</FieldLabel>
										<field.InputGroupField />
									</div>
								)}
							</form.AppField>

							{/* Taille */}
							<form.AppField name="initialSku.size">
								{(field) => (
									<div className="space-y-2">
										<FieldLabel optional>Taille</FieldLabel>
										<field.InputGroupField />
									</div>
								)}
							</form.AppField>
						</div>
					</div>

					{/* Status */}
					<form.AppField name="status">
						{(field) => (
							<div className="space-y-2">
								<FieldLabel required>Statut de publication</FieldLabel>
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
			</FormLayout>

			{/* SECTIONS 3 & 4 : Prix et disponibilité + Galerie côte à côte */}
			<FormLayout cols={2}>
				{/* SECTION 3 : Prix et disponibilité */}
				<FormSection
					title="Prix et disponibilité"
					description="Configuration du prix et du stock initial"
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
					<form.AppField name="initialSku.compareAtPriceEuros">
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
									Laissez vide si pas de promotion. Si renseigné, sera affiché
									barré
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

				{/* SECTION 4 : Galerie d'images */}
				<FormSection
					title="Galerie d'images et vidéos"
					description="Images et vidéos supplémentaires du bijou (jusqu'à 10 médias)"
				>
					<form.Field name="initialSku.galleryMedia" mode="array">
						{(field) => {
							const currentCount = field.state.value.length;
							const maxCount = 10;
							const isAtLimit = currentCount >= maxCount;

							return (
								<div className="space-y-4">
									{/* Compteur de médias */}
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-2 text-sm text-muted-foreground">
											<ImagePlus className="h-4 w-4" />
											<span className="font-medium">
												{currentCount} / {maxCount} médias
											</span>
										</div>
										<ImageCounterBadge count={currentCount} max={maxCount} />
									</div>

									{/* Alerte si limite atteinte */}
									{isAtLimit && (
										<div className="bg-secondary/10 border border-secondary rounded-lg p-3 flex items-start gap-2">
											<svg
												xmlns="http://www.w3.org/2000/svg"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												strokeWidth="2"
												strokeLinecap="round"
												strokeLinejoin="round"
												className="h-4 w-4 text-secondary-foreground mt-0.5 shrink-0"
											>
												<circle cx="12" cy="12" r="10" />
												<line x1="12" y1="16" x2="12" y2="12" />
												<line x1="12" y1="8" x2="12.01" y2="8" />
											</svg>
											<div className="text-sm text-secondary-foreground">
												<p className="font-medium">Limite atteinte</p>
												<p className="text-xs mt-0.5">
													Vous avez atteint la limite de {maxCount} médias par
													galerie. Supprimez un média existant pour en ajouter
													un nouveau.
												</p>
											</div>
										</div>
									)}

									{/* Grille d'images */}
									<AnimatePresence mode="popLayout">
										{field.state.value.length > 0 && (
											<motion.div
												initial={{ opacity: 0 }}
												animate={{ opacity: 1 }}
												exit={{ opacity: 0 }}
												className="mb-4"
												role="region"
												aria-label="Galerie d'images"
											>
												<ImageGallery
													images={field.state.value}
													onRemove={(index) => field.removeValue(index)}
												/>
											</motion.div>
										)}
									</AnimatePresence>

									{/* État vide avec icônes */}
									{field.state.value.length === 0 && (
										<div className="flex items-center gap-3 py-4 px-4 text-left bg-muted/20 rounded-lg border border-dashed border-border">
											<ImagePlus className="h-8 w-8 text-muted-foreground/50 shrink-0" />
											<div>
												<p className="text-sm font-medium text-foreground">
													Aucun média dans la galerie
												</p>
												<p className="text-xs text-muted-foreground mt-0.5">
													Ajoutez jusqu'à {maxCount} images et vidéos pour
													montrer votre bijou sous différents angles
												</p>
											</div>
										</div>
									)}

									{/* Zone d'upload */}
									{!isAtLimit && (
										<UploadDropzone
											endpoint="catalogMedia"
											onChange={async (files) => {
												// Limiter le nombre d'images uploadées en une fois
												const remaining = maxCount - field.state.value.length;
												let filesToUpload = files.slice(0, remaining);

												if (files.length > remaining) {
													toast.warning(
														`Seulement ${remaining} média${remaining > 1 ? "s" : ""} ${remaining > 1 ? "ont" : "a"} été ajouté${remaining > 1 ? "s" : ""}`
													);
												}

												// Créer un mapping file -> mediaType
												const fileTypeMap = new Map(
													filesToUpload.map((f) => [
														f.name,
														f.type.startsWith("video/") ? "VIDEO" : "IMAGE",
													])
												);

												// Validation de la taille (4MB pour images, 512MB pour vidéos)
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
													// Retirer les fichiers trop lourds
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
															field.pushValue({
																url: imageUrl,
																altText: form.state.values.title || undefined,
																mediaType:
																	(fileTypeMap.get(originalFile.name) as
																		| "IMAGE"
																		| "VIDEO"
																		| undefined) || "IMAGE",
															});
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
																			field.pushValue({
																				url: imageUrl,
																				altText:
																					form.state.values.title || undefined,
																				mediaType:
																					(fileTypeMap.get(
																						originalFile.name
																					) as "IMAGE" | "VIDEO" | undefined) ||
																					"IMAGE",
																			});
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
																Carré recommandé • 1200x1200px min • Max 4MB (image) / 512MB (vidéo)
															</p>
															<p className="text-xs text-muted-foreground">
																Vous pouvez sélectionner plusieurs fichiers à la fois
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

			{/* Footer avec boutons d'action */}
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
										isGalleryUploading
									}
									className="min-w-[160px]"
								>
									{isPending
										? "Enregistrement..."
										: isPrimaryImageUploading
											? "Upload image principale..."
											: isGalleryUploading
												? "Upload galerie..."
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
