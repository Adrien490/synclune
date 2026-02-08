"use client"

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
	MoreVertical,
} from "lucide-react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { useState } from "react"

import type { ReviewAdmin } from "../../types/review.types"
import { useReviewModeration } from "../../hooks/use-review-moderation"

const ReviewDetailDialog = dynamic(
	() => import("./review-detail-dialog").then((mod) => mod.ReviewDetailDialog),
)

interface ReviewRowActionsProps {
	review: ReviewAdmin
}

/**
 * Actions disponibles pour chaque ligne d'avis dans l'admin
 */
export function ReviewRowActions({ review }: ReviewRowActionsProps) {
	const [moderateDialogOpen, setModerateDialogOpen] = useState(false)
	const [detailDialogOpen, setDetailDialogOpen] = useState(false)

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
					{/* Voir le détail */}
					<DropdownMenuItem
						onSelect={() => setDetailDialogOpen(true)}
						className="flex items-center cursor-pointer"
					>
						<Eye className="mr-2 h-4 w-4" aria-hidden="true" />
						Voir le détail
					</DropdownMenuItem>

					{/* Voir le produit */}
					<DropdownMenuItem asChild>
						<Link
							href={`/creations/${review.product.slug}`}
							target="_blank"
							className="flex items-center cursor-pointer"
						>
							<ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
							Voir le produit
						</Link>
					</DropdownMenuItem>

					<DropdownMenuSeparator />

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

			{/* Dialog de détail (lazy-loaded) */}
			{detailDialogOpen && (
				<ReviewDetailDialog
					review={review}
					open={detailDialogOpen}
					onOpenChange={setDetailDialogOpen}
				/>
			)}

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
									<span className="font-semibold">{review.user.name || "Anonyme"}</span>{" "}
									sur &quot;{review.product.title}&quot; ne sera plus visible sur le site.
								</>
							) : (
								<>
									L&apos;avis de{" "}
									<span className="font-semibold">{review.user.name || "Anonyme"}</span>{" "}
									sur &quot;{review.product.title}&quot; sera visible sur le site.
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
