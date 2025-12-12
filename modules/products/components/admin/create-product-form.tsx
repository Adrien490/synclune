"use client";

import { FieldLabel, FormLayout, FormSection } from "@/shared/components/forms";
import { MediaCounterBadge } from "@/modules/media/components/media-counter-badge";
import { MediaUploadGrid } from "@/modules/media/components/admin/media-upload-grid";
import { Button } from "@/shared/components/ui/button";
import { InputGroupAddon, InputGroupText } from "@/shared/components/ui/input-group";
import { Label } from "@/shared/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { MultiSelect } from "@/shared/components/multi-select";
import { useCreateProductForm } from "@/modules/products/hooks/use-create-product-form";
import { cn } from "@/shared/utils/cn";
import { UploadDropzone } from "@/modules/media/utils/uploadthing";
import { useMediaUpload } from "@/modules/media/hooks/use-media-upload";
import { Euro, Gem, ImagePlus, Image as ImageIcon, Info, Package, Upload } from "lucide-react";
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
	const { upload: uploadMedia, isUploading: isMediaUploading, progress: uploadProgress } = useMediaUpload();

	const { form, action, isPending } = useCreateProductForm({
		onSuccess: (message) => {
			toast.success(message || "Bijou créé avec succès", {
				action: { label: "Voir les bijoux", onClick: () => router.push("/admin/catalogue/produits") },
			});
			form.reset();
		},
	});

	const isUploading = isMediaUploading;

	const maxMediaCount = 11;

	const handleUpload = async (
		files: File[],
		field: {
			state: { value: Array<{ url: string; mediaType: "IMAGE" | "VIDEO"; altText?: string; thumbnailUrl?: string | null; blurDataUrl?: string }> };
			pushValue: (value: { url: string; mediaType: "IMAGE" | "VIDEO"; altText?: string; thumbnailUrl?: string | null; blurDataUrl?: string }) => void;
		}
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
			className="space-y-6 pb-32"
			onSubmit={() => void form.handleSubmit()}
		>
			{/* Hidden fields */}
			<form.Subscribe selector={(state) => [state.values.initialSku.media]}>
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

				{/* Section Visuels */}
				<FormSection
					title="Visuels"
					description="Images et vidéos du produit"
					icon={<ImageIcon />}
				>
					<form.Field
						name="initialSku.media"
						mode="array"
						validators={{
							onChange: ({ value }) =>
								value.length === 0 ? "Au moins une image est requise" : undefined,
							onSubmit: ({ value }) =>
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
											<Label>
												Médias <span className="text-destructive">*</span>
											</Label>
											<p className="text-xs text-muted-foreground mt-1">
												La première image sera l'image principale. Glissez pour réordonner.
											</p>
										</div>
										<MediaCounterBadge count={currentCount} max={maxMediaCount} />
									</div>

									{isAtLimit && (
										<div className="bg-secondary/10 border border-secondary rounded-lg p-3 flex items-start gap-2">
											<Info className="h-4 w-4 text-secondary-foreground mt-0.5 shrink-0" />
											<p className="text-xs text-secondary-foreground">
												Limite de {maxMediaCount} médias atteinte
											</p>
										</div>
									)}

									{field.state.value.length === 0 ? (
										<div className="space-y-3">
											{/* Feedback d'upload en cours */}
											{isMediaUploading && uploadProgress ? (
												<div className="flex flex-col items-center justify-center gap-4 py-8 px-4 bg-primary/5 rounded-xl border-2 border-primary/20">
													<div className="relative">
														<div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
														<Upload className="absolute inset-0 m-auto h-6 w-6 text-primary" />
													</div>
													<div className="text-center space-y-1">
														<p className="font-medium text-foreground">
															{uploadProgress.phase === "validating" && "Validation des fichiers..."}
															{uploadProgress.phase === "generating-thumbnails" && "Génération des miniatures..."}
															{uploadProgress.phase === "uploading" && "Upload en cours..."}
															{uploadProgress.phase === "done" && "Terminé !"}
														</p>
														<p className="text-sm text-muted-foreground">
															{uploadProgress.completed} / {uploadProgress.total} fichier(s)
														</p>
														{uploadProgress.current && (
															<p className="text-xs text-muted-foreground/70 truncate max-w-[200px]">
																{uploadProgress.current}
															</p>
														)}
													</div>
												</div>
											) : (
												<>
													<div className="flex items-center gap-3 py-3 px-3 bg-muted/20 rounded-lg border border-dashed border-border">
														<ImagePlus className="h-5 w-5 text-muted-foreground/50" />
														<p className="text-sm text-muted-foreground">
															Ajoutez jusqu'à {maxMediaCount} images et vidéos
														</p>
													</div>
													<UploadDropzone
														endpoint="catalogMedia"
														onChange={(files) => handleUpload(files, field)}
														onUploadError={(error) => { toast.error(`Erreur: ${error.message}`); }}
														className="w-full"
														appearance={{
															container: ({ isDragActive }) => ({
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
																cursor: "pointer",
															}),
															uploadIcon: () => ({ display: "none" }),
															label: () => ({ display: "none" }),
															allowedContent: () => ({ display: "none" }),
															button: () => ({ display: "none" }),
														}}
														content={{
															uploadIcon: () => <Upload className="h-12 w-12 text-primary/70" />,
															label: ({ isDragActive }) => (
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
													/>
												</>
											)}
											{field.state.meta.errors.length > 0 && (
												<p className="text-sm text-destructive text-center">
													{field.state.meta.errors[0]}
												</p>
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
													})
												);
											}}
											maxItems={maxMediaCount}
											renderUploadZone={
												isAtLimit
													? undefined
													: () => (
															isMediaUploading ? (
																<div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-primary/5 rounded-lg">
																	<div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
																	<p className="text-xs text-muted-foreground">
																		{uploadProgress?.completed ?? 0}/{uploadProgress?.total ?? 0}
																	</p>
																</div>
															) : (
																<UploadDropzone
																	endpoint="catalogMedia"
																	onChange={(files) => handleUpload(files, field)}
																	onUploadError={(error) => { toast.error(`Erreur: ${error.message}`); }}
																	className="w-full h-full min-h-0"
																	appearance={{
																		container: ({ isDragActive }) => ({
																			height: "100%",
																			display: "flex",
																			flexDirection: "column",
																			alignItems: "center",
																			justifyContent: "center",
																			cursor: "pointer",
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
																		uploadIcon: () => <Upload className="h-6 w-6 text-muted-foreground/50" />,
																		label: () => (
																			<p className="text-xs text-muted-foreground text-center mt-1">
																				Ajouter
																			</p>
																		),
																	}}
																/>
															)
														)
											}
										/>
									)}
								</div>
							);
						}}
					</form.Field>
				</FormSection>

				{/* Section Le bijou */}
				<FormLayout>
					<FormSection
						title="Le bijou"
						description="Informations et caractéristiques"
						icon={<Gem />}
					>
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

							<div className="space-y-4">
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
											<Button type="button" variant="ghost" size="icon" className="h-auto w-auto p-0 hover:bg-transparent">
												<Info className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
											</Button>
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

							<div className="space-y-4">
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

					{/* Section Prix et stock */}
					<FormSection
						title="Prix et stock"
						description="Tarification et disponibilité"
						icon={<Euro />}
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
				</FormLayout>

				{/* Footer */}
				<form.AppForm>
					<div className="mt-6 flex flex-col sm:flex-row justify-end gap-3">
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
