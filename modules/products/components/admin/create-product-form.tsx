"use client";

import { FieldLabel, FormLayout, FormSection } from "@/shared/components/tanstack-form";
import {
	WizardProvider,
	useWizardContext,
	useFormWizard,
	WizardStepContainer,
	WizardMobileShell,
	createTanStackFormAdapter,
	type WizardStep,
} from "@/shared/features/form-wizard";
import { ImageCounterBadge } from "@/modules/medias/components/image-counter-badge";
import { MediaGallery } from "@/modules/medias/components/admin/media-gallery";
import { PrimaryImageUpload } from "@/modules/medias/components/admin/primary-image-upload";
import { useAutoVideoThumbnail } from "@/modules/medias/hooks/use-auto-video-thumbnail";
import { useUnsavedChanges } from "@/shared/features/form-wizard";
import { Button } from "@/shared/components/ui/button";
import { InputGroupAddon, InputGroupText } from "@/shared/components/ui/input-group";
import { Label } from "@/shared/components/ui/label";
import { TextShimmer } from "@/shared/components/ui/text-shimmer";
import { MultiSelect } from "@/shared/components/multi-select";
import { useCreateProductForm } from "@/modules/products/hooks/use-create-product-form";
import { cn } from "@/shared/utils/cn";
import { UploadDropzone, useUploadThing } from "@/modules/medias/utils/uploadthing";
import { AnimatePresence, motion } from "framer-motion";
import { Euro, Gem, ImagePlus, Image as ImageIcon, Info, Package, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const PRODUCT_STEPS: WizardStep[] = [
	{
		id: "bijou",
		label: "Le bijou",
		description: "Informations et caractéristiques",
		icon: <Gem className="size-4" />,
		fields: [
			"title",
			"description",
			"typeId",
			"collectionIds",
			"initialSku.colorId",
			"initialSku.materialId",
			"initialSku.size",
		],
	},
	{
		id: "prix",
		label: "Prix et stock",
		description: "Tarification et disponibilité",
		icon: <Euro className="size-4" />,
		fields: [
			"initialSku.priceInclTaxEuros",
			"initialSku.compareAtPriceEuros",
			"initialSku.inventory",
		],
	},
	{
		id: "visuels",
		label: "Visuels",
		description: "Image principale et galerie",
		icon: <ImageIcon className="size-4" />,
		fields: ["initialSku.primaryImage", "initialSku.galleryMedia"],
	},
];

interface CreateProductFormProps {
	productTypes: Array<{ id: string; label: string; slug: string; isActive: boolean }>;
	collections: Array<{ id: string; name: string; slug: string }>;
	colors: Array<{ id: string; name: string; hex: string }>;
	materials: Array<{ id: string; name: string }>;
}

export function CreateProductForm({
	productTypes,
	collections,
	colors,
	materials,
}: CreateProductFormProps) {
	return (
		<WizardProvider totalSteps={PRODUCT_STEPS.length} desktopMode="all">
			<CreateProductFormContent
				productTypes={productTypes}
				collections={collections}
				colors={colors}
				materials={materials}
			/>
		</WizardProvider>
	);
}

function CreateProductFormContent({
	productTypes,
	collections,
	colors,
	materials,
}: CreateProductFormProps) {
	const router = useRouter();
	const { generateThumbnail, generatingUrls } = useAutoVideoThumbnail();
	const { startUpload: startPrimaryImageUpload, isUploading: isPrimaryImageUploading } = useUploadThing("catalogMedia");
	const { startUpload: startGalleryUpload, isUploading: isGalleryUploading } = useUploadThing("catalogMedia");

	// Get resetWizard and isMobile from context first (needed for onSuccess)
	const { resetWizard, isMobile } = useWizardContext();

	// Create form with onSuccess that resets wizard on mobile
	const { form, action, isPending } = useCreateProductForm({
		onSuccess: (message) => {
			toast.success(message || "Bijou créé avec succès", {
				action: { label: "Voir les bijoux", onClick: () => router.push("/admin/catalogue/produits") },
			});
			form.reset();
			// Reset wizard to step 1 on mobile
			if (isMobile) {
				resetWizard();
			}
		},
	});

	// Now create wizard with form (using adapter for type safety)
	const wizard = useFormWizard({
		steps: PRODUCT_STEPS,
		form: createTanStackFormAdapter(form),
	});

	const isUploading = isPrimaryImageUploading || isGalleryUploading || generatingUrls.size > 0;

	// Warn user about unsaved changes before leaving the page
	useUnsavedChanges(form.state.isDirty && !isPending);

	// Render the step sections
	const renderStepContent = (stepIndex: number) => {
		switch (stepIndex) {
			case 0:
				return (
					<FormSection
						title="Le bijou"
						description="Informations et caractéristiques"
						icon={<Gem />}
						hideHeader={wizard.effectiveMode === "wizard"}
					>
						<div className="space-y-6">
							<form.AppField
								name="title"
								validators={{
									onBlur: ({ value }) =>
										!value || value.trim().length < 2
											? "Le titre doit contenir au moins 2 caractères"
											: undefined,
								}}
							>
								{(field) => (
									<div className="space-y-2">
										<FieldLabel required>Titre du bijou</FieldLabel>
										<field.InputField label="" required autoFocus />
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

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<form.AppField name="typeId">
									{(field) => (
										<div className="space-y-2">
											<FieldLabel optional>Type de bijou</FieldLabel>
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

							<form.AppField name="initialSku.colorId">
								{(field) => (
									<div className="space-y-2">
										<FieldLabel optional>Couleur</FieldLabel>
										<field.SelectField
											label=""
											options={colors.map((c) => ({
												value: c.id,
												label: c.name,
											}))}
											renderOption={(opt) => {
												const c = colors.find((x) => x.id === opt.value);
												return (
													<div className="flex items-center gap-2">
														{c && (
															<div
																className="w-4 h-4 rounded-full border border-border"
																style={{ backgroundColor: c.hex }}
															/>
														)}
														<span>{opt.label}</span>
													</div>
												);
											}}
											renderValue={(val) => {
												const c = colors.find((x) => x.id === val);
												return c ? (
													<div className="flex items-center gap-2">
														<div
															className="w-4 h-4 rounded-full border border-border"
															style={{ backgroundColor: c.hex }}
														/>
														<span>{c.name}</span>
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

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<form.AppField name="initialSku.materialId">
									{(field) => (
										<div className="space-y-2">
											<FieldLabel optional>Matériau</FieldLabel>
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

								<form.AppField name="initialSku.size">
									{(field) => (
										<div className="space-y-2">
											<FieldLabel optional>Taille</FieldLabel>
											<field.InputGroupField placeholder="Ex: 52, Ajustable, 18cm..." />
										</div>
									)}
								</form.AppField>
							</div>
						</div>
					</FormSection>
				);

			case 1:
				return (
					<FormSection
						title="Prix et stock"
						description="Tarification et disponibilité"
						icon={<Euro />}
						hideHeader={wizard.effectiveMode === "wizard"}
					>
						<div className="space-y-6">
							<form.AppField
								name="initialSku.priceInclTaxEuros"
								validators={{
									onChange: ({ value }: { value: number | null }) =>
										value === null || value <= 0
											? "Le prix doit être supérieur à 0"
											: undefined,
								}}
							>
								{(field) => (
									<div className="space-y-2">
										<FieldLabel required>Prix de vente final</FieldLabel>
										<field.InputGroupField type="number" step="0.01" required>
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

							<form.AppField
								name="initialSku.compareAtPriceEuros"
								validators={{
									onChangeListenTo: ["initialSku.priceInclTaxEuros"],
									onChange: ({ value, fieldApi }) => {
										if (!value) return undefined;
										const price = fieldApi.form.getFieldValue(
											"initialSku.priceInclTaxEuros"
										);
										return price && value < price
											? "Le prix comparé doit être supérieur ou égal au prix de vente"
											: undefined;
									},
									onBlur: ({ value, fieldApi }) => {
										if (!value) return undefined;
										const price = fieldApi.form.getFieldValue(
											"initialSku.priceInclTaxEuros"
										);
										return price && value < price
											? "Le prix comparé doit être supérieur ou égal au prix de vente"
											: undefined;
									},
								}}
							>
								{(field) => (
									<div className="space-y-2">
										<FieldLabel optional>
											Prix comparé (avant réduction)
										</FieldLabel>
										<field.InputGroupField type="number" step="0.01">
											<InputGroupAddon>
												<Euro className="h-4 w-4" />
											</InputGroupAddon>
										</field.InputGroupField>
										<p className="text-xs text-muted-foreground">
											Si renseigné, le prix de vente sera affiché comme une
											promotion
										</p>
									</div>
								)}
							</form.AppField>

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
						</div>
					</FormSection>
				);

			case 2:
				return (
					<FormSection
						title="Visuels"
						description="Image principale et galerie"
						icon={<ImageIcon />}
						hideHeader={wizard.effectiveMode === "wizard"}
					>
						<div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
							<form.Field
								name="initialSku.primaryImage"
								validators={{
									onBlur: ({ value }) =>
										!value ? "L'image principale est requise" : undefined,
									onSubmit: ({ value }) =>
										!value ? "L'image principale est requise" : undefined,
								}}
							>
								{(field) => (
									<div className="space-y-2">
										<Label>
											Image principale{" "}
											<span className="text-destructive">*</span>
										</Label>
										<p className="text-xs text-muted-foreground">
											Les vidéos ne sont pas acceptées pour l'image principale
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
																	"Une seule image principale autorisée"
																);
																return;
															}
															const file = files[0];
															if (file.type.startsWith("video/")) {
																toast.error(
																	"Veuillez uploader une image, pas une vidéo"
																);
																return;
															}
															if (file.size > 4 * 1024 * 1024) {
																toast.error(
																	"Image trop volumineuse (max 4MB)"
																);
																return;
															}
															try {
																const res =
																	await startPrimaryImageUpload(files);
																const imageUrl = res?.[0]?.serverData?.url;
																if (imageUrl)
																	field.handleChange({
																		url: imageUrl,
																		altText:
																			form.state.values.title || undefined,
																		mediaType: "IMAGE",
																	});
															} catch {
																toast.error("Échec de l'upload");
															}
														}}
														onUploadError={(error) => {
															toast.error(`Erreur: ${error.message}`);
														}}
														className="w-full"
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
																height: "min(200px, 25vh)",
																minHeight: "160px",
																display: "flex",
																flexDirection: "column",
																alignItems: "center",
																justifyContent: "center",
																gap: "0.5rem",
																cursor: isUploading ? "not-allowed" : "pointer",
																opacity: isUploading ? 0.7 : 1,
															}),
															uploadIcon: () => ({ display: "none" }),
															label: () => ({ display: "none" }),
															allowedContent: () => ({ display: "none" }),
															button: () => ({ display: "none" }),
														}}
														content={{
															uploadIcon: ({ isUploading, uploadProgress }) =>
																isUploading ? (
																	<TextShimmer
																		className="text-sm font-medium"
																		duration={1.5}
																	>{`Upload... ${uploadProgress}%`}</TextShimmer>
																) : (
																	<Upload className="h-12 w-12 text-primary/70" />
																),
															label: ({ isDragActive, isUploading }) =>
																isUploading ? null : (
																	<div className="text-center space-y-1">
																		<p className="font-medium">
																			{isDragActive
																				? "Relâchez"
																				: "Ajouter l'image principale"}
																		</p>
																		<p className="text-xs text-muted-foreground">
																			Max 4MB
																		</p>
																	</div>
																),
														}}
														config={{ mode: "auto" }}
													/>
													{field.state.meta.errors.length > 0 && (
														<p className="text-sm text-destructive mt-2 text-center">
															{field.state.meta.errors[0]}
														</p>
													)}
												</div>
											)}
										/>
									</div>
								)}
							</form.Field>

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
													<p className="text-xs text-secondary-foreground">
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
														<MediaGallery
															images={field.state.value}
															onRemove={(index) => field.removeValue(index)}
															generatingThumbnails={generatingUrls}
														/>
													</motion.div>
												)}
											</AnimatePresence>

											{field.state.value.length === 0 && (
												<div className="flex items-center gap-3 py-3 px-3 bg-muted/20 rounded-lg border border-dashed border-border">
													<ImagePlus className="h-5 w-5 text-muted-foreground/50" />
													<p className="text-sm text-muted-foreground">
														Jusqu'à {maxCount} images et vidéos
													</p>
												</div>
											)}

											{!isAtLimit && (
												<UploadDropzone
													endpoint="catalogMedia"
													onChange={async (files) => {
														const remaining =
															maxCount - field.state.value.length;
														let filesToUpload = files.slice(0, remaining);
														if (files.length > remaining)
															toast.warning(
																`Seulement ${remaining} média(s) ajouté(s)`
															);

														const fileTypeMap = new Map(
															filesToUpload.map((f) => [
																f.name,
																f.type.startsWith("video/") ? "VIDEO" : "IMAGE",
															])
														);
														const oversizedFiles = filesToUpload.filter(
															(f) =>
																f.size >
																(f.type.startsWith("video/")
																	? 512 * 1024 * 1024
																	: 4 * 1024 * 1024)
														);

														if (oversizedFiles.length > 0) {
															toast.error(
																`${oversizedFiles.length} fichier(s) trop volumineux`
															);
															filesToUpload = filesToUpload.filter(
																(f) =>
																	f.size <=
																	(f.type.startsWith("video/")
																		? 512 * 1024 * 1024
																		: 4 * 1024 * 1024)
															);
															if (filesToUpload.length === 0) return;
														}

														try {
															const res = await startGalleryUpload(filesToUpload);
															res?.forEach(
																(
																	uploadResult: {
																		serverData?: { url?: string };
																	},
																	index: number
																) => {
																	const imageUrl =
																		uploadResult?.serverData?.url;
																	if (imageUrl) {
																		const originalFile = filesToUpload[index];
																		const mediaType =
																			(fileTypeMap.get(originalFile.name) as
																				| "IMAGE"
																				| "VIDEO") || "IMAGE";
																		field.pushValue({
																			url: imageUrl,
																			altText:
																				form.state.values.title || undefined,
																			mediaType,
																		});

																		if (mediaType === "VIDEO") {
																			generateThumbnail(imageUrl)
																				.then((result) => {
																					if (result.mediumUrl) {
																						const idx =
																							field.state.value.findIndex(
																								(m) => m.url === imageUrl
																							);
																						if (idx !== -1)
																							field.replaceValue(idx, {
																								...field.state.value[idx],
																								thumbnailUrl: result.mediumUrl,
																								thumbnailSmallUrl:
																									result.smallUrl,
																							});
																					}
																				})
																				.catch(() =>
																					toast.warning(
																						"Miniature vidéo non générée"
																					)
																				);
																		}
																	}
																}
															);
														} catch {
															toast.error("Échec de l'upload");
														}
													}}
													onUploadError={(error) => {
														toast.error(`Erreur: ${error.message}`);
													}}
													className="w-full"
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
															height: "min(120px, 20vh)",
															display: "flex",
															flexDirection: "column",
															alignItems: "center",
															justifyContent: "center",
															cursor: isUploading ? "not-allowed" : "pointer",
															opacity: isUploading ? 0.7 : 1,
														}),
														uploadIcon: () => ({ display: "none" }),
														label: () => ({ display: "none" }),
														allowedContent: () => ({ display: "none" }),
														button: () => ({ display: "none" }),
													}}
													content={{
														uploadIcon: ({ isUploading, uploadProgress }) =>
															isUploading ? (
																<TextShimmer
																	className="text-sm"
																	duration={1.5}
																>{`Ajout... ${uploadProgress}%`}</TextShimmer>
															) : (
																<Upload className="h-8 w-8 text-primary/70" />
															),
														label: ({ isDragActive, isUploading }) => {
															if (isUploading) return null;
															const remaining =
																maxCount - field.state.value.length;
															return (
																<p className="text-sm font-medium">
																	{isDragActive
																		? "Relâchez"
																		: `Ajouter (${remaining} restant${remaining > 1 ? "s" : ""})`}
																</p>
															);
														},
													}}
													config={{ mode: "auto" }}
												/>
											)}
										</div>
									);
								}}
							</form.Field>
						</div>
					</FormSection>
				);

			default:
				return null;
		}
	};

	// Render form footer (desktop only, mobile uses WizardNavigation)
	const renderFooter = () => (
		<form.AppForm>
			<div className="mt-6 flex justify-end gap-3">
				<form.Subscribe selector={(state) => [state.canSubmit]}>
					{([canSubmit]) => (
						<>
							<Button
								type="submit"
								variant="secondary"
								disabled={!canSubmit || isPending || isUploading}
								onClick={() => form.setFieldValue("status", "DRAFT")}
							>
								{isPending && form.state.values.status === "DRAFT"
									? "Enregistrement..."
									: "Enregistrer comme brouillon"}
							</Button>
							<Button
								type="submit"
								disabled={!canSubmit || isPending || isUploading}
								onClick={() => form.setFieldValue("status", "PUBLIC")}
							>
								{isPending && form.state.values.status === "PUBLIC"
									? "Enregistrement..."
									: isPrimaryImageUploading
										? "Upload image..."
										: isGalleryUploading
											? "Upload galerie..."
											: generatingUrls.size > 0
												? "Génération miniatures..."
												: "Publier le bijou"}
							</Button>
						</>
					)}
				</form.Subscribe>
			</div>
		</form.AppForm>
	);

	// Mobile: Use wizard shell
	if (wizard.effectiveMode === "wizard") {
		return (
			<form
				action={action}
				className="space-y-6"
				onSubmit={() => void form.handleSubmit()}
			>
				{/* Hidden fields */}
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
				<form.Subscribe
					selector={(state) => [state.values.initialSku.galleryMedia]}
				>
					{([galleryMedia]) =>
						galleryMedia?.length ? (
							<input
								type="hidden"
								name="initialSku.galleryMedia"
								value={JSON.stringify(galleryMedia)}
							/>
						) : null
					}
				</form.Subscribe>
				<form.Subscribe selector={(state) => [state.values.status]}>
					{([status]) => <input type="hidden" name="status" value={status} />}
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

				<form.AppForm>
					<form.FormErrorDisplay />
				</form.AppForm>

				<WizardMobileShell
					steps={PRODUCT_STEPS}
					currentStep={wizard.currentStep}
					completedSteps={wizard.completedSteps}
					onStepClick={wizard.goToStep}
					isFirstStep={wizard.isFirstStep}
					isLastStep={wizard.isLastStep}
					onPrevious={wizard.goPrevious}
					onNext={wizard.goNext}
					isSubmitting={isPending}
					isValidating={wizard.isValidating}
					getStepErrors={wizard.getStepErrors}
					renderLastStepFooter={() => (
						<div className="flex items-center gap-3">
							<Button
								type="button"
								variant="outline"
								onClick={wizard.goPrevious}
								disabled={isPending || isUploading}
								className="flex-1 h-12"
							>
								Précédent
							</Button>
							<form.Subscribe selector={(state) => [state.canSubmit]}>
								{([canSubmit]) => (
									<>
										<Button
											type="submit"
											variant="secondary"
											disabled={!canSubmit || isPending || isUploading}
											onClick={() => form.setFieldValue("status", "DRAFT")}
											className="flex-1 h-12"
										>
											{isPending && form.state.values.status === "DRAFT"
												? "..."
												: "Brouillon"}
										</Button>
										<Button
											type="submit"
											disabled={!canSubmit || isPending || isUploading}
											onClick={() => form.setFieldValue("status", "PUBLIC")}
											className="flex-1 h-12"
										>
											{isPending && form.state.values.status === "PUBLIC"
												? "..."
												: "Publier"}
										</Button>
									</>
								)}
							</form.Subscribe>
						</div>
					)}
				>
					{PRODUCT_STEPS.map((step, index) => (
						<WizardStepContainer key={step.id} step={step} stepIndex={index}>
							{renderStepContent(index)}
						</WizardStepContainer>
					))}
				</WizardMobileShell>
			</form>
		);
	}

	// Desktop: Show all sections
	return (
		<form
			action={action}
			className="space-y-6 pb-32"
			onSubmit={() => void form.handleSubmit()}
		>
			{/* Hidden fields */}
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
			<form.Subscribe
				selector={(state) => [state.values.initialSku.galleryMedia]}
			>
				{([galleryMedia]) =>
					galleryMedia?.length ? (
						<input
							type="hidden"
							name="initialSku.galleryMedia"
							value={JSON.stringify(galleryMedia)}
						/>
					) : null
				}
			</form.Subscribe>
			<form.Subscribe selector={(state) => [state.values.status]}>
				{([status]) => <input type="hidden" name="status" value={status} />}
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

			<div className="space-y-6">
				<form.AppForm>
					<form.FormErrorDisplay />
				</form.AppForm>

				<FormLayout cols={2}>
					{renderStepContent(0)}
					{renderStepContent(1)}
				</FormLayout>

				{renderStepContent(2)}

				{renderFooter()}
			</div>
		</form>
	);
}
