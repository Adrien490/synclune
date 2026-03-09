"use client";

import { FieldLabel } from "@/shared/components/forms";
import { MediaCounterBadge } from "@/modules/media/components/media-counter-badge";
import { MediaUploadGrid } from "@/modules/media/components/admin/media-upload-grid";
import { Button } from "@/shared/components/ui/button";
import { InputGroupAddon, InputGroupText } from "@/shared/components/ui/input-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { MultiSelect } from "@/shared/components/multi-select";
import { useCreateProductForm } from "@/modules/products/hooks/use-create-product-form";
import { UploadDropzone } from "@/modules/media/utils/uploadthing";
import { useMediaUpload } from "@/modules/media/hooks/use-media-upload";
import { ARRAY_LIMITS } from "@/shared/constants/validation-limits";
import { Euro, ImagePlus, Info, Package, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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
	const router = useRouter();
	const {
		upload: uploadMedia,
		isUploading: isMediaUploading,
		progress: uploadProgress,
	} = useMediaUpload();

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

	const isUploading = isMediaUploading;

	const maxMediaCount = ARRAY_LIMITS.SKU_MEDIA;

	const handleUpload = async (
		files: File[],
		field: {
			state: {
				value: Array<{
					url: string;
					mediaType: "IMAGE" | "VIDEO";
					altText?: string;
					thumbnailUrl?: string | null;
					blurDataUrl?: string;
				}>;
			};
			pushValue: (value: {
				url: string;
				mediaType: "IMAGE" | "VIDEO";
				altText?: string;
				thumbnailUrl?: string | null;
				blurDataUrl?: string;
			}) => void;
		},
	) => {
		const remaining = maxMediaCount - field.state.value.length;
		let filesToUpload = files.slice(0, remaining);

		// Trier: images d'abord, vidéos ensuite
		filesToUpload = filesToUpload.sort((a, b) => {
			const aIsVideo = a.type.startsWith("video/");
			const bIsVideo = b.type.startsWith("video/");
			if (aIsVideo === bIsVideo) return 0;
			return aIsVideo ? 1 : -1;
		});

		if (files.length > remaining) {
			toast.warning(`Seulement ${remaining} média(s) ajouté(s)`);
		}

		if (field.state.value.length === 0 && filesToUpload[0]?.type.startsWith("video/")) {
			toast.error("La première image doit être une image, pas une vidéo");
			return;
		}

		if (filesToUpload.length === 0) return;

		// useMediaUpload gère la validation de taille et génère les thumbnails vidéo côté client
		const results = await uploadMedia(filesToUpload);
		results.forEach((result) => {
			field.pushValue({
				url: result.url,
				altText: form.state.values.title || undefined,
				mediaType: result.mediaType,
				thumbnailUrl: result.thumbnailUrl,
				blurDataUrl: result.blurDataUrl,
			});
		});
	};

	return (
		<form
			action={action}
			aria-label="Formulaire de création de bijou"
			className="space-y-6 pb-16 sm:pb-32"
			onSubmit={() => void form.handleSubmit()}
		>
			{/* Hidden fields */}
			<form.Subscribe selector={(state) => [state.values.initialSku.media]}>
				{([media]) =>
					media?.length ? (
						<input type="hidden" name="initialSku.media" value={JSON.stringify(media)} />
					) : null
				}
			</form.Subscribe>
			<form.Subscribe selector={(state) => [state.values.status]}>
				{([status]) => <input type="hidden" name="status" value={status} />}
			</form.Subscribe>
			<form.Subscribe selector={(state) => [state.values.collectionIds]}>
				{([collectionIds]) => (
					<input type="hidden" name="collectionIds" value={JSON.stringify(collectionIds)} />
				)}
			</form.Subscribe>

			<div className="space-y-6">
				{/* Visuels */}
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
						const isAtLimit = currentCount >= maxMediaCount;

						return (
							<div className="space-y-3">
								<div className="flex items-center justify-between">
									<div>
										<FieldLabel htmlFor="media-upload-zone" required>
											Médias
										</FieldLabel>
										<p className="text-muted-foreground mt-1 text-xs">
											La première image sera l'image principale. Glissez pour réordonner.
										</p>
									</div>
									<MediaCounterBadge count={currentCount} max={maxMediaCount} />
								</div>

								{isAtLimit && (
									<div className="bg-secondary/10 border-secondary flex items-start gap-2 rounded-lg border p-3">
										<Info className="text-secondary-foreground mt-0.5 h-4 w-4 shrink-0" />
										<p className="text-secondary-foreground text-xs">
											Limite de {maxMediaCount} médias atteinte
										</p>
									</div>
								)}

								{field.state.value.length === 0 ? (
									<div className="space-y-3">
										{/* Feedback d'upload en cours */}
										{isMediaUploading && uploadProgress ? (
											<div
												role="status"
												aria-live="polite"
												className="bg-primary/5 border-primary/20 flex flex-col items-center justify-center gap-4 rounded-xl border-2 px-4 py-8"
											>
												<div className="relative">
													<div className="border-primary/20 border-t-primary h-16 w-16 animate-spin rounded-full border-4" />
													<Upload className="text-primary absolute inset-0 m-auto h-6 w-6" />
												</div>
												<div className="space-y-1 text-center">
													<p className="text-foreground font-medium">
														{uploadProgress.phase === "validating" && "Validation des fichiers..."}
														{uploadProgress.phase === "generating-thumbnails" &&
															"Génération des miniatures..."}
														{uploadProgress.phase === "uploading" && "Upload en cours..."}
														{uploadProgress.phase === "done" && "Terminé !"}
													</p>
													<p className="text-muted-foreground text-sm">
														{uploadProgress.completed} / {uploadProgress.total} fichier(s)
													</p>
													{uploadProgress.current && (
														<p className="text-muted-foreground/70 max-w-50 truncate text-xs">
															{uploadProgress.current}
														</p>
													)}
												</div>
											</div>
										) : (
											<div id="media-upload-zone" className="space-y-3">
												<div className="bg-muted/20 border-border flex items-center gap-3 rounded-lg border border-dashed px-3 py-3">
													<ImagePlus className="text-muted-foreground/50 h-5 w-5" />
													<p className="text-muted-foreground text-sm">
														Ajoutez jusqu'à {maxMediaCount} images et vidéos
													</p>
												</div>
												<UploadDropzone
													endpoint="catalogMedia"
													onChange={(files) => handleUpload(files, field)}
													onUploadError={(error) => {
														toast.error(`Erreur: ${error.message}`);
													}}
													className="focus-within:ring-ring w-full rounded-xl focus-within:ring-2 focus-within:ring-offset-2"
													appearance={{
														container: ({ isDragActive }) => ({
															border: "2px dashed",
															borderColor: isDragActive
																? "var(--primary)"
																: "color-mix(in oklch, var(--muted-foreground) 25%, transparent)",
															borderRadius: "0.75rem",
															backgroundColor: isDragActive
																? "color-mix(in oklch, var(--primary) 5%, transparent)"
																: "color-mix(in oklch, var(--muted) 30%, transparent)",
															padding: "1.5rem",
															height: "min(200px, 25vh)",
															minHeight: "160px",
															display: "flex",
															flexDirection: "column",
															alignItems: "center",
															justifyContent: "center",
															gap: "0.5rem",
															cursor: "pointer",
														}),
														uploadIcon: () => ({ display: "none" }),
														label: () => ({ display: "none" }),
														allowedContent: () => ({ display: "none" }),
														button: () => ({ display: "none" }),
													}}
													content={{
														uploadIcon: () => <Upload className="text-primary/70 h-12 w-12" />,
														label: ({ isDragActive }) => (
															<div className="space-y-1 text-center">
																<p className="font-medium">
																	{isDragActive ? "Relâchez" : "Ajouter des médias"}
																</p>
																<p className="text-muted-foreground text-xs">
																	Images (max 16MB) et vidéos (max 512MB)
																</p>
															</div>
														),
													}}
												/>
											</div>
										)}
										{field.state.meta.errors.length > 0 && (
											<div role="alert" className="text-destructive space-y-1 text-center text-sm">
												{field.state.meta.errors.map((error) => (
													<p key={String(error)}>{String(error)}</p>
												))}
											</div>
										)}
									</div>
								) : (
									<MediaUploadGrid
										media={field.state.value.map((m) => ({
											url: m.url,
											mediaType: m.mediaType,
											altText: m.altText ?? undefined,
											thumbnailUrl: m.thumbnailUrl ?? undefined,
											blurDataUrl: m.blurDataUrl ?? undefined,
										}))}
										onChange={(newMedia) => {
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
													blurDataUrl: m.blurDataUrl ?? undefined,
												}),
											);
										}}
										maxItems={maxMediaCount}
										renderUploadZone={
											isAtLimit
												? undefined
												: () =>
														isMediaUploading ? (
															<div className="bg-primary/5 flex h-full w-full flex-col items-center justify-center gap-2 rounded-lg">
																<div className="border-primary/20 border-t-primary h-8 w-8 animate-spin rounded-full border-2" />
																<p className="text-muted-foreground text-xs">
																	{uploadProgress?.completed ?? 0}/{uploadProgress?.total ?? 0}
																</p>
															</div>
														) : (
															<UploadDropzone
																endpoint="catalogMedia"
																onChange={(files) => handleUpload(files, field)}
																onUploadError={(error) => {
																	toast.error(`Erreur: ${error.message}`);
																}}
																className="h-full min-h-0 w-full"
																appearance={{
																	container: ({ isDragActive }) => ({
																		height: "100%",
																		display: "flex",
																		flexDirection: "column",
																		alignItems: "center",
																		justifyContent: "center",
																		cursor: "pointer",
																		backgroundColor: isDragActive
																			? "color-mix(in oklch, var(--primary) 5%, transparent)"
																			: "transparent",
																	}),
																	uploadIcon: () => ({ display: "none" }),
																	label: () => ({ display: "none" }),
																	allowedContent: () => ({ display: "none" }),
																	button: () => ({ display: "none" }),
																}}
																content={{
																	uploadIcon: () => (
																		<Upload className="text-muted-foreground/50 h-6 w-6" />
																	),
																	label: () => (
																		<p className="text-muted-foreground mt-1 text-center text-xs">
																			Ajouter
																		</p>
																	),
																}}
															/>
														)
										}
									/>
								)}
							</div>
						);
					}}
				</form.Field>

				{/* Le bijou */}
				<div className="space-y-6">
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
								<field.InputField label="" required />
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
								rows={3}
								maxLength={500}
								showCounter
							/>
						)}
					</form.AppField>

					<div className="space-y-4">
						<form.AppField name="typeId">
							{(field) => (
								<div className="space-y-2">
									<FieldLabel htmlFor={field.name} optional>
										Type de bijou
									</FieldLabel>
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
										defaultValue={field.state.value}
										onValueChange={(values) => field.handleChange(values)}
										placeholder="Sélectionner des collections"
										maxCount={2}
										hideSelectAll
									/>
									<p className="text-muted-foreground text-xs">
										Un produit peut appartenir à plusieurs collections
									</p>
								</div>
							)}
						</form.AppField>
					</div>

					{/* Section attributs de la variante initiale */}
					<fieldset className="border-border/50 space-y-1 border-t pt-4">
						<div className="flex items-center gap-1">
							<legend className="text-foreground/80 text-sm font-medium">
								Attributs de la variante
							</legend>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										type="button"
										variant="ghost"
										size="icon"
										className="-m-2 h-8 min-h-11 w-8 min-w-11 hover:bg-transparent"
										aria-label="Plus d'informations sur les attributs de la variante"
									>
										<Info className="text-muted-foreground hover:text-foreground h-4 w-4 transition-colors" />
									</Button>
								</TooltipTrigger>
								<TooltipContent side="right" className="max-w-[250px]">
									<p>
										Ces attributs concernent la première variante du produit. Vous pourrez ajouter
										d'autres variantes après la création.
									</p>
								</TooltipContent>
							</Tooltip>
						</div>
						<p className="text-muted-foreground text-xs">
							Caractéristiques de la première variante
						</p>
					</fieldset>

					<form.AppField name="initialSku.colorId">
						{(field) => (
							<div className="space-y-2">
								<FieldLabel htmlFor={field.name} optional>
									Couleur
								</FieldLabel>
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
														className="border-border h-4 w-4 rounded-full border"
														style={{ backgroundColor: c.hex }}
														aria-hidden="true"
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
													className="border-border h-4 w-4 rounded-full border"
													style={{ backgroundColor: c.hex }}
													aria-hidden="true"
												/>
												<span>{c.name}</span>
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

					<div className="space-y-4">
						<form.AppField name="initialSku.materialId">
							{(field) => (
								<div className="space-y-2">
									<FieldLabel htmlFor={field.name} optional>
										Matériau
									</FieldLabel>
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

				{/* Prix et stock */}
				<div className="space-y-6">
					<form.AppField name="initialSku.priceInclTaxEuros">
						{(field) => (
							<div className="space-y-2">
								<FieldLabel required>Prix de vente final</FieldLabel>
								<field.InputGroupField type="number" step="0.01" required>
									<InputGroupAddon>
										<Euro className="h-4 w-4" />
									</InputGroupAddon>
								</field.InputGroupField>
								<p className="text-muted-foreground text-xs">Le prix que paiera le client</p>
							</div>
						)}
					</form.AppField>

					<form.AppField
						name="initialSku.compareAtPriceEuros"
						validators={{
							onChangeListenTo: ["initialSku.priceInclTaxEuros"],
							onChange: ({ value, fieldApi }) => {
								if (!value) return undefined;
								const price = fieldApi.form.getFieldValue("initialSku.priceInclTaxEuros");
								return price && value < price
									? "Le prix comparé doit être supérieur ou égal au prix de vente"
									: undefined;
							},
							onBlur: ({ value, fieldApi }) => {
								if (!value) return undefined;
								const price = fieldApi.form.getFieldValue("initialSku.priceInclTaxEuros");
								return price && value < price
									? "Le prix comparé doit être supérieur ou égal au prix de vente"
									: undefined;
							},
						}}
					>
						{(field) => (
							<div className="space-y-2">
								<FieldLabel optional>Ancien prix (affiché barré)</FieldLabel>
								<field.InputGroupField type="number" step="0.01">
									<InputGroupAddon>
										<Euro className="h-4 w-4" />
									</InputGroupAddon>
								</field.InputGroupField>
								<p className="text-muted-foreground text-xs">
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
										<Package className="text-muted-foreground h-4 w-4" />
										<InputGroupText className="text-muted-foreground text-xs">
											unités
										</InputGroupText>
									</InputGroupAddon>
								</field.InputGroupField>
								<p className="text-muted-foreground text-xs">
									Laissez vide ou 0 si le bijou est en rupture
								</p>
							</div>
						)}
					</form.AppField>
				</div>

				{/* Footer */}
				<form.AppForm>
					<div className="mt-6 flex flex-col justify-end gap-3 sm:flex-row">
						{/* Annonce pour les lecteurs d'ecran */}
						<span className="sr-only" role="status" aria-live="polite">
							{isPending ? "Envoi du formulaire en cours..." : ""}
						</span>
						<form.Subscribe selector={(state) => [state.canSubmit]}>
							{([canSubmit]) => (
								<>
									<Button
										type="submit"
										variant="secondary"
										disabled={!canSubmit || isPending || isUploading}
										onClick={() => form.setFieldValue("status", "DRAFT")}
										className="w-full sm:w-auto"
									>
										{isPending && form.state.values.status === "DRAFT"
											? "Chargement..."
											: "Enregistrer comme brouillon"}
									</Button>
									<Button
										type="submit"
										disabled={!canSubmit || isPending || isUploading}
										onClick={() => form.setFieldValue("status", "PUBLIC")}
										className="w-full sm:w-auto"
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
			</div>
		</form>
	);
}
