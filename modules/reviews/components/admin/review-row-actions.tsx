"use client"

import { ReviewStatus } from "@/app/generated/prisma/client"
import { Button } from "@/shared/components/ui/button"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog"
import {
	Eye,
	EyeOff,
	ExternalLink,
	Loader2,
	MessageSquare,
	MoreVertical,
	Star,
} from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { useReviewModeration } from "../../hooks/use-review-moderation"

interface ReviewRowActionsProps {
	review: {
		id: string
		status: ReviewStatus
		productSlug: string
		productTitle: string
		userName: string | null
		hasResponse: boolean
	}
	onOpenResponse?: () => void
}

/**
 * Actions disponibles pour chaque ligne d'avis dans l'admin
 */
export function ReviewRowActions({
	review,
	onOpenResponse,
}: ReviewRowActionsProps) {
	const [moderateDialogOpen, setModerateDialogOpen] = useState(false)

	const { toggleStatus, isPending } = useReviewModeration({
		onSuccess: () => setModerateDialogOpen(false),
	})

	const isPublished = review.status === "PUBLISHED"

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="ghost"
						className="h-11 w-11 p-0 active:scale-95 transition-transform"
						aria-label="Actions"
					>
						<MoreVertical className="h-4 w-4" aria-hidden="true" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					{/* Voir le produit */}
					<DropdownMenuItem asChild>
						<Link
							href={`/creations/${review.productSlug}`}
							target="_blank"
							className="flex items-center cursor-pointer"
						>
							<ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
							Voir le produit
						</Link>
					</DropdownMenuItem>

					<DropdownMenuSeparator />

					{/* Répondre */}
					{!review.hasResponse && onOpenResponse && (
						<DropdownMenuItem
							onClick={onOpenResponse}
							className="flex items-center cursor-pointer"
						>
							<MessageSquare className="mr-2 h-4 w-4" aria-hidden="true" />
							Répondre
						</DropdownMenuItem>
					)}

					{/* Masquer / Afficher */}
					<DropdownMenuItem
						onClick={() => setModerateDialogOpen(true)}
						className="flex items-center cursor-pointer"
					>
						{isPublished ? (
							<>
								<EyeOff className="mr-2 h-4 w-4" aria-hidden="true" />
								Masquer
							</>
						) : (
							<>
								<Eye className="mr-2 h-4 w-4" aria-hidden="true" />
								Publier
							</>
						)}
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			{/* Dialog de confirmation modération */}
			<AlertDialog open={moderateDialogOpen} onOpenChange={setModerateDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{isPublished ? "Masquer cet avis ?" : "Publier cet avis ?"}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{isPublished ? (
								<>
									L&apos;avis de{" "}
									<span className="font-semibold">{review.userName || "Anonyme"}</span>{" "}
									sur &quot;{review.productTitle}&quot; ne sera plus visible sur le site.
								</>
							) : (
								<>
									L&apos;avis de{" "}
									<span className="font-semibold">{review.userName || "Anonyme"}</span>{" "}
									sur &quot;{review.productTitle}&quot; sera visible sur le site.
								</>
							)}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
						<Button
							onClick={() => toggleStatus(review.id)}
							disabled={isPending}
							variant={isPublished ? "destructive" : "default"}
						>
							{isPending ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
									{isPublished ? "Masquage..." : "Publication..."}
								</>
							) : (
								<>
									{isPublished ? (
										<>
											<EyeOff className="mr-2 h-4 w-4" aria-hidden="true" />
											Masquer
										</>
									) : (
										<>
											<Eye className="mr-2 h-4 w-4" aria-hidden="true" />
											Publier
										</>
									)}
								</>
							)}
						</Button>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	)
}
