"use client";

import { FieldLabel, FormLayout, FormSection } from "@/shared/components/tanstack-form";
import { MediaUploadGrid } from "@/modules/media/components/admin/media-upload-grid";
import { Button } from "@/shared/components/ui/button";
import { InputGroupAddon, InputGroupText } from "@/shared/components/ui/input-group";
import { Label } from "@/shared/components/ui/label";
import { UploadProgress } from "@/modules/media/components/admin/upload-progress";
import { MultiSelect } from "@/shared/components/multi-select";
import type { GetProductReturn } from "@/modules/products/types/product.types";
import { useUpdateProductForm } from "@/modules/products/hooks/use-update-product-form";
import { cn } from "@/shared/utils/cn";
import { UploadDropzone, useUploadThing } from "@/modules/media/utils/uploadthing";
import { Euro, Gem, Image as ImageIcon, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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

	const { startUpload: startMediaUpload, isUploading: isMediaUploading } =
		useUploadThing("catalogMedia");

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
			}, 2000);
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
						description="Informations et caractéristiques"
						icon={<Gem />}
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
						<form.AppField name="defaultSku.colorId">
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
							<form.AppField name="defaultSku.materialId">
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
									<FieldLabel required>Statut</FieldLabel>
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
					</FormSection>

					{/* SECTION 2 : Prix et stock */}
					<FormSection
						title="Prix et stock"
						description="Tarification et disponibilité du SKU par défaut"
						icon={<Euro />}
					>
						{/* Prix final */}
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
									<FieldLabel required>Statut du SKU</FieldLabel>
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
					</FormSection>
				</FormLayout>

				{/* ═══════════════════════════════════════════════════════════════════════
				    SECTION 3 : Visuels (pleine largeur)
				    ═══════════════════════════════════════════════════════════════════════ */}
				<FormSection
					title="Visuels"
					description="Première image = principale • Glissez pour réordonner"
					icon={<ImageIcon />}
				>
					<form.Field name="defaultSku.media" mode="array">
						{(field) => {
							const maxCount = 11;

							const handleUploadComplete = (
								uploadedFiles: Array<{
									url: string;
									name: string;
									type: string;
									thumbnailUrl?: string;
									thumbnailSmallUrl?: string;
									blurDataUrl?: string | null;
								}>
							) => {
								const remaining = maxCount - field.state.value.length;
								const filesToAdd = uploadedFiles.slice(0, remaining);

								if (uploadedFiles.length > remaining) {
									toast.warning(
										`Seulement ${remaining} média${remaining > 1 ? "s ont" : " a"} été ajouté${remaining > 1 ? "s" : ""}`
									);
								}

								filesToAdd.forEach((file) => {
									const mediaType = file.type.startsWith("video/")
										? "VIDEO"
										: "IMAGE";

									// Les thumbnails vidéo sont générées côté serveur dans onUploadComplete
									field.pushValue({
										url: file.url,
										thumbnailUrl: file.thumbnailUrl ?? undefined,
										thumbnailSmallUrl: file.thumbnailSmallUrl ?? undefined,
										blurDataUrl: file.blurDataUrl ?? undefined,
										altText: form.state.values.title || undefined,
										mediaType: mediaType as "IMAGE" | "VIDEO",
									});
								});
							};

							return (
								<div className="space-y-4">
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
											// Clear and repopulate the field
											while (field.state.value.length > 0) {
												field.removeValue(0);
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
										skipUtapiDelete={true}
										maxItems={maxCount}
										renderUploadZone={() => (
											<UploadDropzone
												endpoint="catalogMedia"
												onChange={async (files) => {
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
														toast.warning(
															`Seulement ${remaining} média${remaining > 1 ? "s ont" : " a"} été ajouté${remaining > 1 ? "s" : ""}`
														);
													}

													// Vérifier la taille des fichiers
													const oversizedFiles = filesToUpload.filter((f) => {
														const maxFileSize = f.type.startsWith("video/")
															? 512 * 1024 * 1024
															: 4 * 1024 * 1024;
														return f.size > maxFileSize;
													});
													if (oversizedFiles.length > 0) {
														toast.error(
															`${oversizedFiles.length} média(s) dépassent la limite`
														);
														filesToUpload = filesToUpload.filter((f) => {
															const maxFileSize = f.type.startsWith("video/")
																? 512 * 1024 * 1024
																: 4 * 1024 * 1024;
															return f.size <= maxFileSize;
														});
														if (filesToUpload.length === 0) return;
													}

													try {
														const res = await startMediaUpload(filesToUpload);
														if (res) {
															handleUploadComplete(
																res.map((r, i) => ({
																	url: r.serverData?.url || "",
																	name: filesToUpload[i].name,
																	type: filesToUpload[i].type,
																	thumbnailUrl: r.serverData?.thumbnailUrl,
																	thumbnailSmallUrl: r.serverData?.thumbnailSmallUrl,
																	blurDataUrl: r.serverData?.blurDataUrl,
																}))
															);
														}
													} catch {
														toast.error("Échec de l'upload des médias");
													}
												}}
												onUploadError={(error) => {
													toast.error(`Erreur: ${error.message}`);
												}}
												className="w-full *:after:hidden! *:before:hidden! [&>*::after]:hidden! [&>*::before]:hidden! ut-loading-text:!hidden ut-readying:!hidden ut-uploading:after:!hidden"
												aria-label="Zone d'upload des médias"
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
														height: "min(180px, 22vh)",
														minHeight: "140px",
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
														fontSize: "0.9rem",
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
																	"h-12 w-12 transition-all duration-200",
																	isDragActive
																		? "text-primary scale-110"
																		: "text-primary/70"
																)}
															/>
														);
													},
													label: ({ isDragActive, isUploading }) => {
														if (isUploading) return null;

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
																	Glisse tes médias ici
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
															Sélectionner des médias
														</span>
													),
												}}
												config={{
													mode: "auto",
												}}
											/>
										)}
									/>
									{field.state.meta.errors.length > 0 && (
										<ul
											className="text-sm text-destructive mt-2 list-none space-y-1"
											role="alert"
										>
											{field.state.meta.errors.map((error, i) => (
												<li key={i}>{error}</li>
											))}
										</ul>
									)}
									<p className="text-xs text-muted-foreground">
										⚠️ La première position doit être une image (pas une vidéo) • Format carré recommandé • 1200x1200px min
									</p>
								</div>
							);
						}}
					</form.Field>
				</FormSection>

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
										className="min-w-[160px]"
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
