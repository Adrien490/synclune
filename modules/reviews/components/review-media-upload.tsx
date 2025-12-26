"use client"

import { useState } from "react"
import Image from "next/image"
import { Camera, X, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { UploadDropzone } from "@/modules/media/utils/uploadthing"
import { Button } from "@/shared/components/ui/button"
import { cn } from "@/shared/utils/cn"

import { REVIEW_CONFIG } from "../constants/review.constants"

export interface ReviewMediaItem {
	url: string
	blurDataUrl?: string
	altText?: string
}

interface ReviewMediaUploadProps {
	/** Médias actuels */
	media: ReviewMediaItem[]
	/** Callback quand les médias changent */
	onChange: (media: ReviewMediaItem[]) => void
	/** Désactiver l'upload pendant le submit */
	disabled?: boolean
	/** Classes CSS additionnelles */
	className?: string
}

/**
 * Composant d'upload de photos pour les avis clients
 * Permet d'ajouter jusqu'à 3 photos avec prévisualisation
 */
export function ReviewMediaUpload({
	media,
	onChange,
	disabled = false,
	className,
}: ReviewMediaUploadProps) {
	const [isUploading, setIsUploading] = useState(false)
	const canAddMore = media.length < REVIEW_CONFIG.MAX_MEDIA_COUNT && !disabled

	const removeMedia = (index: number) => {
		const newMedia = media.filter((_, i) => i !== index)
		onChange(newMedia)
	}

	return (
		<div className={cn("space-y-3", className)} aria-busy={isUploading} aria-live="polite">
			{/* Aperçu des photos */}
			{media.length > 0 && (
				<div className="flex gap-2 flex-wrap" role="list" aria-label="Photos ajoutées">
					{media.map((m, index) => (
						<div
							key={m.url}
							role="listitem"
							className="relative size-20 rounded-lg overflow-hidden group border bg-muted"
						>
							<Image
								src={m.url}
								alt={m.altText || `Photo ${index + 1}`}
								fill
								className="object-cover"
								sizes="80px"
								placeholder={m.blurDataUrl ? "blur" : "empty"}
								blurDataURL={m.blurDataUrl}
							/>
							<button
								type="button"
								onClick={() => removeMedia(index)}
								disabled={disabled}
								className={cn(
									"absolute inset-0 bg-black/50 opacity-0 transition-opacity flex items-center justify-center",
									!disabled && "group-hover:opacity-100"
								)}
								aria-label={`Supprimer la photo ${index + 1}`}
							>
								<X className="size-5 text-white" aria-hidden="true" />
							</button>
						</div>
					))}
				</div>
			)}

			{/* Zone d'upload */}
			{canAddMore && (
				<div className="relative">
					{isUploading && (
						<div className="absolute inset-0 bg-background/80 z-10 flex items-center justify-center rounded-lg" role="status">
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<Loader2 className="size-4 animate-spin" aria-hidden="true" />
								Upload en cours...
							</div>
						</div>
					)}
					<UploadDropzone
						endpoint="reviewMedia"
						onUploadBegin={() => setIsUploading(true)}
						onClientUploadComplete={(res) => {
							setIsUploading(false)
							if (res && res.length > 0) {
								const newMedia: ReviewMediaItem[] = res.map((file) => ({
									url: file.ufsUrl,
									blurDataUrl: file.serverData?.blurDataUrl || undefined,
									altText: undefined,
								}))
								// Ne garder que les 3 premiers
								const updatedMedia = [...media, ...newMedia].slice(0, REVIEW_CONFIG.MAX_MEDIA_COUNT)
								onChange(updatedMedia)
								toast.success(`${res.length} photo${res.length > 1 ? "s" : ""} ajoutée${res.length > 1 ? "s" : ""}`)
							}
						}}
						onUploadError={(error) => {
							setIsUploading(false)
							toast.error(error.message || "Erreur lors de l'upload")
						}}
						config={{
							mode: "auto",
						}}
						appearance={{
							container: cn(
								"border-2 border-dashed rounded-lg p-4 cursor-pointer transition-colors",
								"hover:border-primary/50 hover:bg-muted/50",
								"ut-uploading:border-primary ut-uploading:bg-primary/5"
							),
							uploadIcon: "hidden",
							label: "hidden",
							allowedContent: "hidden",
							button: "hidden",
						}}
						content={{
							uploadIcon: () => null,
							label: () => (
								<div className="flex flex-col items-center gap-2 py-2">
									<div className="p-2 rounded-full bg-muted">
										<Camera className="size-5 text-muted-foreground" aria-hidden="true" />
									</div>
									<div className="text-center">
										<p className="text-sm font-medium">
											Ajouter des photos
										</p>
										<p className="text-xs text-muted-foreground">
											{REVIEW_CONFIG.MAX_MEDIA_COUNT - media.length} restante{REVIEW_CONFIG.MAX_MEDIA_COUNT - media.length > 1 ? "s" : ""} (max 4 Mo)
										</p>
									</div>
								</div>
							),
							allowedContent: () => null,
							button: () => null,
						}}
					/>
				</div>
			)}

			{/* Indicateur de limite atteinte */}
			{media.length >= REVIEW_CONFIG.MAX_MEDIA_COUNT && (
				<p className="text-xs text-muted-foreground text-center">
					Limite de {REVIEW_CONFIG.MAX_MEDIA_COUNT} photos atteinte
				</p>
			)}
		</div>
	)
}
