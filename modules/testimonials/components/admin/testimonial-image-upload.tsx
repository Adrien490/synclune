"use client"

import { Button } from "@/shared/components/ui/button"
import { UploadDropzone, useUploadThing } from "@/modules/media/utils/uploadthing"
import { AnimatePresence, motion } from "framer-motion"
import { Trash2, Upload, User } from "lucide-react"
import Image from "next/image"
import { toast } from "sonner"

interface TestimonialImageUploadProps {
	imageUrl: string | null | undefined
	onChange: (url: string | null) => void
	disabled?: boolean
}

/**
 * Composant d'upload d'avatar simple pour les témoignages
 * Utilise l'endpoint testimonialMedia (1 image, 4MB max)
 */
export function TestimonialImageUpload({
	imageUrl,
	onChange,
	disabled = false,
}: TestimonialImageUploadProps) {
	const { startUpload, isUploading } = useUploadThing("testimonialMedia")

	const handleRemove = () => {
		onChange(null)
		toast.success("Image supprimée")
	}

	const isDisabled = disabled || isUploading

	return (
		<div className="space-y-2">
			<AnimatePresence mode="wait">
				{imageUrl ? (
					<motion.div
						key="image-preview"
						initial={{ opacity: 0, scale: 0.95 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 0.95 }}
						className="relative w-24 h-24 group"
					>
						<div className="relative w-full h-full rounded-full overflow-hidden border-2 border-primary/20">
							<Image
								src={imageUrl}
								alt="Avatar du témoignage"
								fill
								className="object-cover"
								sizes="96px"
							/>
						</div>

						{/* Bouton de suppression au hover */}
						<div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
							<Button
								type="button"
								variant="destructive"
								size="icon"
								onClick={handleRemove}
								disabled={isDisabled}
								className="h-8 w-8"
								aria-label="Supprimer l'image"
							>
								<Trash2 className="h-4 w-4" />
							</Button>
						</div>
					</motion.div>
				) : (
					<motion.div
						key="upload-zone"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="w-full"
					>
						<UploadDropzone
							endpoint="testimonialMedia"
							disabled={isDisabled}
							onChange={async (files) => {
								if (files.length === 0) return
								try {
									const res = await startUpload(files)
									const url = res?.[0]?.serverData?.url
									if (url) {
										onChange(url)
										toast.success("Image uploadée")
									}
								} catch (error) {
									toast.error("Erreur lors de l'upload", {
										description:
											error instanceof Error
												? error.message
												: "Erreur inconnue",
									})
								}
							}}
							onUploadError={(error) => {
								toast.error("Erreur lors de l'upload", {
									description: error.message,
								})
							}}
							appearance={{
								container:
									"border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 hover:border-primary/50 transition-colors cursor-pointer ut-uploading:cursor-not-allowed",
								label: "text-sm text-muted-foreground",
								allowedContent: "text-xs text-muted-foreground/70",
								button: "hidden",
								uploadIcon: "hidden",
							}}
							content={{
								label: () => (
									<div className="flex flex-col items-center gap-2 py-2">
										<div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
											<User className="h-6 w-6 text-muted-foreground" />
										</div>
										<div className="flex items-center gap-1 text-sm text-muted-foreground">
											<Upload className="h-4 w-4" />
											<span>Cliquer ou glisser une image</span>
										</div>
									</div>
								),
								allowedContent: () => (
									<span className="text-xs text-muted-foreground/70">
										PNG, JPG, WebP (max 4MB)
									</span>
								),
							}}
						/>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	)
}
