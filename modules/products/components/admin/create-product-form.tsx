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
import { MediaCounterBadge } from "@/modules/media/components/media-counter-badge";
import { MediaUploadGrid } from "@/modules/media/components/admin/media-upload-grid";
import { useUnsavedChanges } from "@/shared/features/form-wizard";
import { Button } from "@/shared/components/ui/button";
import { InputGroupAddon, InputGroupText } from "@/shared/components/ui/input-group";
import { Label } from "@/shared/components/ui/label";
import { UploadProgress } from "@/modules/media/components/admin/upload-progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { MultiSelect } from "@/shared/components/multi-select";
import { useCreateProductForm } from "@/modules/products/hooks/use-create-product-form";
import { cn } from "@/shared/utils/cn";
import { UploadDropzone, useUploadThing } from "@/modules/media/utils/uploadthing";
import { Euro, Gem, ImagePlus, Image as ImageIcon, Info, Package, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const PRODUCT_STEPS: WizardStep[] = [
	{
		id: "visuels",
		label: "Visuels",
		description: "Images et vidéos du produit",
		icon: <ImageIcon className="size-4" />,
		fields: ["initialSku.media"],
	},
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
];

interface CreateProductFormProps {
	productTypes: Array<{ id: string; label: string }>;
	collections: Array<{ id: string; name: string }>;
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
	const { startUpload, isUploading: isMediaUploading } = useUploadThing("catalogMedia");

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

	const isUploading = isMediaUploading;

	// Warn user about unsaved changes before leaving the page
	useUnsavedChanges(form.state.isDirty && !isPending);

	// Render the step sections
	const renderStepContent = (stepIndex: number) => {
		switch (stepIndex) {
			case 1:
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

							{/* Section attributs de la variante initiale */}
							<div className="space-y-1 pt-4 border-t border-border/50">
								<div className="flex items-center gap-2">
									<h4 className="text-sm font-medium text-foreground/80">
										Attributs de la variante
									</h4>
									<Tooltip>
										<TooltipTrigger asChild>
											<button type="button" className="inline-flex">
												<Info className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
											</button>
										</TooltipTrigger>
										<TooltipContent side="right" className="max-w-[250px]">
											<p>
												Ces attributs concernent la première variante du produit.
												Tu pourras ajouter d'autres variantes après la création.
											</p>
										</TooltipContent>
									</Tooltip>
								</div>
								<p className="text-xs text-muted-foreground">
									Caractéristiques de la première variante
								</p>
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

			case 2:
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
											Ancien prix (affiché barré)
										</FieldLabel>
										<field.InputGroupField type="number" step="0.01">
											<InputGroupAddon>
												<Euro className="h-4 w-4" />
											</InputGroupAddon>
										</field.InputGroupField>
										<p className="text-xs text-muted-foreground">
											Sera affiché barré à côté du prix actuel (ex:{" "}
											<span className="line-through">45€</span> → 39€)
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

			case 0:
				return (
					<FormSection
						title="Visuels"
						description="Images et vidéos du produit"
						icon={<ImageIcon />}
						hideHeader={wizard.effectiveMode === "wizard"}
					>
						<form.Field
							name="initialSku.media"
							mode="array"
							validators={{
								onChange: ({ value }) =>
									value.length === 0 ? "Au moins une image est requise" : undefined,
							}}
						>
							{(field) => {
								const currentCount = field.state.value.length;
								const maxCount = 11;
								const isAtLimit = currentCount >= maxCount;

								const handleUpload = async (files: File[]) => {
									const remaining = maxCount - field.state.value.length;
									let filesToUpload = files.slice(0, remaining);

									// Trier: images d'abord, vidéos ensuite (l'ordre du navigateur n'est pas garanti)
									filesToUpload = filesToUpload.sort((a, b) => {
										const aIsVideo = a.type.startsWith("video/");
										const bIsVideo = b.type.startsWith("video/");
										if (aIsVideo === bIsVideo) return 0;
										return aIsVideo ? 1 : -1;
									});

									if (files.length > remaining) {
										toast.warning(`Seulement ${remaining} média(s) ajouté(s)`);
									}

									// First file must be an image if gallery is empty
									if (field.state.value.length === 0 && filesToUpload[0]?.type.startsWith("video/")) {
										toast.error("La première image doit être une image, pas une vidéo");
										return;
									}

									const fileTypeMap = new Map(
										filesToUpload.map((f) => [
											f.name,
											f.type.startsWith("video/") ? "VIDEO" as const : "IMAGE" as const,
										])
									);

									const oversizedFiles = filesToUpload.filter(
										(f) =>
											f.size >
											(f.type.startsWith("video/") ? 512 * 1024 * 1024 : 16 * 1024 * 1024)
									);

									if (oversizedFiles.length > 0) {
										toast.error(`${oversizedFiles.length} fichier(s) trop volumineux`);
										filesToUpload = filesToUpload.filter(
											(f) =>
												f.size <=
												(f.type.startsWith("video/") ? 512 * 1024 * 1024 : 16 * 1024 * 1024)
										);
										if (filesToUpload.length === 0) return;
									}

									try {
										const res = await startUpload(filesToUpload);
										res?.forEach((uploadResult, index) => {
											const serverData = uploadResult?.serverData;
											const imageUrl = serverData?.url;
											if (imageUrl) {
												const originalFile = filesToUpload[index];
												const mediaType = fileTypeMap.get(originalFile.name) || "IMAGE";

												// Les thumbnails vidéo sont générées côté serveur dans onUploadComplete
												field.pushValue({
													url: imageUrl,
													altText: form.state.values.title || undefined,
													mediaType,
													// Récupérer les thumbnails générées par le serveur (vidéos)
													thumbnailUrl: serverData.thumbnailUrl ?? undefined,
													thumbnailSmallUrl: serverData.thumbnailSmallUrl ?? undefined,
													blurDataUrl: serverData.blurDataUrl ?? undefined,
												});
											}
										});
									} catch {
										toast.error("Échec de l'upload");
									}
								};

								return (
									<div className="space-y-3">
										<div className="flex items-center justify-between">
											<div>
												<Label>
													Médias <span className="text-destructive">*</span>
												</Label>
												<p className="text-xs text-muted-foreground mt-1">
													La première image sera l'image principale. Glissez pour réordonner.
												</p>
											</div>
											<MediaCounterBadge count={currentCount} max={maxCount} />
										</div>

										{isAtLimit && (
											<div className="bg-secondary/10 border border-secondary rounded-lg p-3 flex items-start gap-2">
												<Info className="h-4 w-4 text-secondary-foreground mt-0.5 shrink-0" />
												<p className="text-xs text-secondary-foreground">
													Limite de {maxCount} médias atteinte
												</p>
											</div>
										)}

										{field.state.value.length === 0 ? (
											<div className="space-y-3">
												<div className="flex items-center gap-3 py-3 px-3 bg-muted/20 rounded-lg border border-dashed border-border">
													<ImagePlus className="h-5 w-5 text-muted-foreground/50" />
													<p className="text-sm text-muted-foreground">
														Ajoutez jusqu'à {maxCount} images et vidéos
													</p>
												</div>
												<UploadDropzone
													endpoint="catalogMedia"
													onChange={handleUpload}
													onUploadError={(error) => { toast.error(`Erreur: ${error.message}`); }}
													className="w-full"
													appearance={{
														container: ({ isDragActive, isUploading: uploading }) => ({
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
															cursor: uploading ? "not-allowed" : "pointer",
															opacity: uploading ? 0.7 : 1,
														}),
														uploadIcon: () => ({ display: "none" }),
														label: () => ({ display: "none" }),
														allowedContent: () => ({ display: "none" }),
														button: () => ({ display: "none" }),
													}}
													content={{
														uploadIcon: ({ isUploading: uploading, uploadProgress }) =>
															uploading ? (
																<UploadProgress progress={uploadProgress} isProcessing={uploadProgress >= 100} />
															) : (
																<Upload className="h-12 w-12 text-primary/70" />
															),
														label: ({ isDragActive, isUploading: uploading }) =>
															uploading ? null : (
																<div className="text-center space-y-1">
																	<p className="font-medium">
																		{isDragActive ? "Relâchez" : "Ajouter des médias"}
																	</p>
																	<p className="text-xs text-muted-foreground">
																		Images (max 16MB) et vidéos (max 512MB)
																	</p>
																</div>
															),
													}}
													config={{ mode: "auto" }}
												/>
												{field.state.meta.errors.length > 0 && (
													<p className="text-sm text-destructive text-center">
														{field.state.meta.errors[0]}
													</p>
												)}
											</div>
										) : (
											<MediaUploadGrid
												media={field.state.value.map(m => ({
													url: m.url,
													mediaType: m.mediaType,
													altText: m.altText ?? undefined,
													thumbnailUrl: m.thumbnailUrl ?? undefined,
													thumbnailSmallUrl: m.thumbnailSmallUrl ?? undefined,
													blurDataUrl: m.blurDataUrl ?? undefined,
												}))}
												onChange={(newMedia) => {
													// Replace all values atomically
													const currentLength = field.state.value.length;
													for (let i = currentLength - 1; i >= 0; i--) {
														field.removeValue(i);
													}
													newMedia.forEach((m) =>
														field.pushValue({
															url: m.url,
															mediaType: m.mediaType,
															altText: m.altText ?? undefined,
															thumbnailUrl: m.thumbnailUrl ?? undefined,
															thumbnailSmallUrl: m.thumbnailSmallUrl ?? undefined,
															blurDataUrl: m.blurDataUrl ?? undefined,
														})
													);
												}}
												maxItems={maxCount}
												renderUploadZone={
													isAtLimit
														? undefined
														: () => (
																<UploadDropzone
																	endpoint="catalogMedia"
																	onChange={handleUpload}
																	onUploadError={(error) => { toast.error(`Erreur: ${error.message}`); }}
																	className="w-full h-full min-h-0"
																	appearance={{
																		container: ({ isDragActive, isUploading: uploading }) => ({
																			height: "100%",
																			display: "flex",
																			flexDirection: "column",
																			alignItems: "center",
																			justifyContent: "center",
																			cursor: uploading ? "not-allowed" : "pointer",
																			opacity: uploading ? 0.7 : 1,
																			backgroundColor: isDragActive
																				? "hsl(var(--primary) / 0.05)"
																				: "transparent",
																		}),
																		uploadIcon: () => ({ display: "none" }),
																		label: () => ({ display: "none" }),
																		allowedContent: () => ({ display: "none" }),
																		button: () => ({ display: "none" }),
																	}}
																	content={{
																		uploadIcon: ({ isUploading: uploading, uploadProgress }) =>
																			uploading ? (
																				<UploadProgress progress={uploadProgress} variant="compact" isProcessing={uploadProgress >= 100} />
																			) : (
																				<Upload className="h-6 w-6 text-muted-foreground/50" />
																			),
																		label: ({ isUploading: uploading }) =>
																			uploading ? null : (
																				<p className="text-xs text-muted-foreground text-center mt-1">
																					Ajouter
																				</p>
																			),
																	}}
																	config={{ mode: "auto" }}
																/>
															)
												}
											/>
										)}
									</div>
								);
							}}
						</form.Field>
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
									? "Chargement..."
									: "Enregistrer comme brouillon"}
							</Button>
							<Button
								type="submit"
								disabled={!canSubmit || isPending || isUploading}
								onClick={() => form.setFieldValue("status", "PUBLIC")}
							>
								{isPending && form.state.values.status === "PUBLIC"
									? "Chargement..."
									: isMediaUploading
										? "Chargement..."
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
					selector={(state) => [state.values.initialSku.media]}
				>
					{([media]) =>
						media?.length ? (
							<input
								type="hidden"
								name="initialSku.media"
								value={JSON.stringify(media)}
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
					isBlocked={isUploading}
					blockedMessage={
						isMediaUploading ? "Upload..." : undefined
					}
					getStepErrors={wizard.getStepErrors}
					renderLastStepFooter={() => (
						<div className="space-y-2">
							{/* Ligne 1: Navigation */}
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={wizard.goPrevious}
								disabled={isPending || isUploading}
								className="w-full text-muted-foreground"
							>
								← Étape précédente
							</Button>
							{/* Ligne 2: Actions */}
							<div className="flex items-center gap-3">
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
													? "Chargement..."
													: "Brouillon"}
											</Button>
											<Button
												type="submit"
												disabled={!canSubmit || isPending || isUploading}
												onClick={() => form.setFieldValue("status", "PUBLIC")}
												className="flex-1 h-12"
											>
												{isPending && form.state.values.status === "PUBLIC"
													? "Chargement..."
													: "Publier"}
											</Button>
										</>
									)}
								</form.Subscribe>
							</div>
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
				selector={(state) => [state.values.initialSku.media]}
			>
				{([media]) =>
					media?.length ? (
						<input
							type="hidden"
							name="initialSku.media"
							value={JSON.stringify(media)}
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

				{renderStepContent(0)}

				<FormLayout cols={2}>
					{renderStepContent(1)}
					{renderStepContent(2)}
				</FormLayout>

				{renderFooter()}
			</div>
		</form>
	);
}
