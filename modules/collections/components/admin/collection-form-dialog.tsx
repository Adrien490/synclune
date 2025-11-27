"use client";

import { CollectionStatus } from "@/app/generated/prisma/enums";
import { CollectionImageUpload } from "@/modules/collections/components/collection-image-upload";
import { COLLECTION_STATUS_LABELS } from "@/modules/collections/constants/collection-status.constants";
import { Button } from "@/shared/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/shared/components/ui/dialog";
import { Label } from "@/shared/components/ui/label";
import { RequiredFieldsNote } from "@/shared/components/ui/required-fields-note";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/components/ui/select";
import { TextShimmer } from "@/shared/components/ui/text-shimmer";
import { useAppForm } from "@/shared/components/forms";
import { createCollection } from "@/modules/collections/actions/create-collection";
import { updateCollection } from "@/modules/collections/actions/update-collection";
import { cn } from "@/shared/utils/cn";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { UploadDropzone, useUploadThing } from "@/shared/utils/uploadthing";
import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { useActionState } from "react";
import { withCallbacks } from "@/shared/utils/with-callbacks/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks/create-toast-callbacks";

export const COLLECTION_DIALOG_ID = "collection-form";

interface CollectionDialogData extends Record<string, unknown> {
	collection?: {
		id: string;
		name: string;
		slug: string;
		description: string | null;
		imageUrl: string | null;
		status: CollectionStatus;
	};
}

export function CollectionFormDialog() {
	const router = useRouter();
	const { isOpen, close, data } =
		useDialog<CollectionDialogData>(COLLECTION_DIALOG_ID);
	const collection = data?.collection;
	const isUpdateMode = !!collection;

	// Hook pour l'upload d'image
	const { startUpload: startImageUpload, isUploading: isImageUploading } =
		useUploadThing("collectionMedia");

	// Single form instance
	const form = useAppForm({
		defaultValues: {
			name: "",
			description: "",
			imageUrl: "",
			status: CollectionStatus.DRAFT as CollectionStatus,
		},
	});

	// Create action
	const [, createAction, isCreatePending] = useActionState(
		withCallbacks(
			createCollection,
			createToastCallbacks({
				loadingMessage: "Création de la collection...",
				showSuccessToast: false,
				onSuccess: (result) => {
					close();
					form.reset();
					const data = result?.data as { collectionStatus?: CollectionStatus } | undefined;
					const statusActionLabels: Record<CollectionStatus, string> = {
						[CollectionStatus.DRAFT]: "Voir les brouillons",
						[CollectionStatus.PUBLIC]: "Voir les publiées",
						[CollectionStatus.ARCHIVED]: "Voir les archivées",
					};
					toast.success(result?.message || "Collection créée avec succès", {
						action: data?.collectionStatus
							? {
									label: statusActionLabels[data.collectionStatus],
									onClick: () =>
										router.push(
											`/admin/catalogue/collections?status=${data.collectionStatus}`
										),
								}
							: undefined,
					});
				},
			})
		),
		undefined
	);

	// Update action
	const [, updateAction, isUpdatePending] = useActionState(
		withCallbacks(
			updateCollection,
			createToastCallbacks({
				loadingMessage: "Modification de la collection...",
				onSuccess: () => {
					close();
				},
			})
		),
		undefined
	);

	const isPending = isCreatePending || isUpdatePending;
	const action = isUpdateMode ? updateAction : createAction;

	// Reset form values when collection data changes
	useEffect(() => {
		if (collection) {
			form.reset({
				name: collection.name,
				description: collection.description ?? "",
				imageUrl: collection.imageUrl ?? "",
				status: collection.status,
			});
		} else {
			form.reset({
				name: "",
				description: "",
				imageUrl: "",
				status: CollectionStatus.DRAFT,
			});
		}
	}, [collection, form]);

	// Handle image upload
	const handleImageUpload = async (
		files: File[],
		field: {
			handleChange: (value: string) => void;
		}
	) => {
		if (files.length > 1) {
			toast.error("Vous ne pouvez uploader qu'une seule image");
			return;
		}

		const file = files[0];

		// Validation de la taille (4MB)
		const maxSize = 4 * 1024 * 1024; // 4MB
		if (file.size > maxSize) {
			const sizeMB = (file.size / 1024 / 1024).toFixed(2);
			toast.error(`L'image dépasse la limite de 4MB (${sizeMB}MB)`);
			return;
		}

		try {
			const res = await startImageUpload(files);
			const imageUrl = res?.[0]?.serverData?.url;
			if (imageUrl) {
				field.handleChange(imageUrl);
			}
		} catch {
			toast.error("Échec de l'upload de l'image", {
				action: {
					label: "Réessayer",
					onClick: async () => {
						try {
							const res = await startImageUpload(files);
							const imageUrl = res?.[0]?.serverData?.url;
							if (imageUrl) {
								field.handleChange(imageUrl);
								toast.success("Image uploadée avec succès");
							}
						} catch {
							toast.error("Échec du nouvel essai");
						}
					},
				},
			});
		}
	};

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(open) => {
				if (!open && !isPending) {
					close();
				}
			}}
		>
			<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						{isUpdateMode ? "Modifier la collection" : "Créer une collection"}
					</DialogTitle>
				</DialogHeader>

				<form
					action={action}
					className="space-y-6"
					onSubmit={() => form.handleSubmit()}
				>
					{/* Hidden fields for update mode */}
					{isUpdateMode && collection && (
						<>
							<input type="hidden" name="id" value={collection.id} />
							<input type="hidden" name="slug" value={collection.slug} />
						</>
					)}

					{/* Champ caché pour sérialiser l'imageUrl */}
					<form.Subscribe selector={(state) => [state.values.imageUrl]}>
						{([imageUrl]) =>
							imageUrl ? (
								<input type="hidden" name="imageUrl" value={imageUrl} />
							) : null
						}
					</form.Subscribe>

					{/* Champ caché pour sérialiser le status */}
					<form.Subscribe selector={(state) => [state.values.status]}>
						{([status]) => (
							<input type="hidden" name="status" value={status} />
						)}
					</form.Subscribe>

					<RequiredFieldsNote />

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						{/* Left: Image Upload Field */}
						<form.AppField name="imageUrl">
							{(field) => (
								<div className="space-y-2">
									<Label htmlFor={`collection-image-upload-${isUpdateMode ? "update" : "create"}`}>
										Image de la collection
									</Label>
									<p className="text-xs text-muted-foreground">
										Format 16:9 recommandé
									</p>
									<CollectionImageUpload
										imageUrl={field.state.value || undefined}
										onRemove={() => field.handleChange("")}
										collectionId={isUpdateMode ? collection?.id : undefined}
										renderUploadZone={() => (
											<div className="relative">
												<UploadDropzone
													endpoint="collectionMedia"
													onChange={(files) => handleImageUpload(files, field)}
													onUploadError={(error) => {
														toast.error(`Erreur: ${error.message}`);
													}}
													className="w-full *:after:hidden! *:before:hidden! [&>*::after]:hidden! [&>*::before]:hidden! ut-loading-text:!hidden ut-readying:!hidden ut-uploading:after:!hidden"
													aria-label="Zone d'upload de l'image de collection"
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
															padding: "1.5rem",
															transition: "all 0.2s ease-in-out",
															height: "100%",
															minHeight: "220px",
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
															width: "2.5rem",
															height: "2.5rem",
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
															fontSize: "0.875rem",
															fontWeight: "600",
															textAlign: "center",
															transition: "color 0.2s ease-in-out",
															opacity: isUploading ? 0.5 : 1,
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
																	<div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/90 backdrop-blur-sm rounded-lg z-10">
																		<div className="text-center">
																			<TextShimmer
																				className="text-sm font-semibold"
																				duration={1.5}
																			>
																				Upload en cours...
																			</TextShimmer>
																			<p className="text-xl font-bold text-primary mt-2">
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
																	<p className="text-sm font-semibold text-primary">
																		Relâchez pour uploader
																	</p>
																);
															}

															return (
																<div className="text-center space-y-1">
																	<p className="text-sm font-semibold">
																		Glissez votre image ici
																	</p>
																	<p className="text-xs text-muted-foreground">
																		ou cliquez pour sélectionner
																	</p>
																	<p className="text-xs text-muted-foreground/80">
																		Max 4MB
																	</p>
																</div>
															);
														},
														allowedContent: () => null,
														button: () => (
															<span className="sr-only">
																Sélectionner une image de collection
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
						</form.AppField>

						{/* Right: Form Fields */}
						<div className="space-y-4">
							{/* Name Field */}
							<form.AppField
								name="name"
								validators={{
									onChange: ({ value }) => {
										if (!value || value.length < 1) {
											return "Le nom est requis";
										}
										if (value.length > 100) {
											return "Le nom ne peut pas dépasser 100 caractères";
										}
										return undefined;
									},
								}}
							>
								{(field) => (
									<field.InputField
										label="Nom"
										type="text"
										placeholder="ex: Nouveautés 2025, Collection Été"
										disabled={isPending}
										required
									/>
								)}
							</form.AppField>

							{/* Description Field */}
							<form.AppField
								name="description"
								validators={{
									onChange: ({ value }) => {
										if (value && value.length > 1000) {
											return "La description ne peut pas dépasser 1000 caractères";
										}
										return undefined;
									},
								}}
							>
								{(field) => (
									<field.TextareaField
										label="Description"
										placeholder="Décrivez cette collection..."
										disabled={isPending}
										rows={5}
									/>
								)}
							</form.AppField>

							{/* Status Field - ARCHIVED only in edit mode */}
							<form.AppField name="status">
								{(field) => {
									const availableStatuses = isUpdateMode
										? Object.values(CollectionStatus)
										: [CollectionStatus.DRAFT, CollectionStatus.PUBLIC];

									return (
										<div className="space-y-2">
											<Label htmlFor="collection-status">Statut</Label>
											<Select
												value={field.state.value}
												onValueChange={(value) => field.handleChange(value as CollectionStatus)}
												disabled={isPending}
											>
												<SelectTrigger id="collection-status" className="w-full">
													<SelectValue placeholder="Sélectionner un statut" />
												</SelectTrigger>
												<SelectContent>
													{availableStatuses.map((status) => (
														<SelectItem key={status} value={status}>
															{COLLECTION_STATUS_LABELS[status]}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
											<p className="text-xs text-muted-foreground">
												Seules les collections publiées sont visibles sur le site
											</p>
										</div>
									);
								}}
							</form.AppField>
						</div>
					</div>

					{/* Submit button */}
					<div className="flex justify-end pt-4">
						<form.Subscribe selector={(state) => [state.canSubmit]}>
							{([canSubmit]) => (
								<Button
									disabled={!canSubmit || isPending || isImageUploading}
									type="submit"
								>
									{isPending
										? "Enregistrement..."
										: isImageUploading
											? "Upload en cours..."
											: isUpdateMode
												? "Enregistrer"
												: "Créer"}
								</Button>
							)}
						</form.Subscribe>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
