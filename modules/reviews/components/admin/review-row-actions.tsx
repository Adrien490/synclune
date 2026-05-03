"use client";

import {
	EllipsisVertical,
	ExternalLink,
	Eye,
	EyeOff,
	LoaderCircle,
	MessageSquare,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";

import {
	ResponsiveActionMenu,
	ResponsiveActionMenuContent,
	ResponsiveActionMenuTrigger,
	type ActionMenuSection,
} from "@/shared/components/responsive-action-menu";
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { Button } from "@/shared/components/ui/button";

import { useReviewModeration } from "../../hooks/use-review-moderation";
import type { ReviewAdmin } from "../../types/review.types";

const ReviewDetailDialog = dynamic(() =>
	import("./review-detail-dialog").then((mod) => mod.ReviewDetailDialog),
);

interface ReviewRowActionsProps {
	review: ReviewAdmin;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	hideTrigger?: boolean;
}

export function ReviewRowActions({
	review,
	open,
	onOpenChange,
	hideTrigger,
}: ReviewRowActionsProps) {
	const [moderateDialogOpen, setModerateDialogOpen] = useState(false);
	const [detailDialogOpen, setDetailDialogOpen] = useState(false);

	const { toggleStatus, isPending } = useReviewModeration({
		onSuccess: () => setModerateDialogOpen(false),
	});

	const isPublished = review.status === "PUBLISHED";

	const sections: ActionMenuSection[] = [
		{
			key: "navigate",
			items: [
				{
					key: "detail",
					label: "Voir le détail",
					icon: Eye,
					onSelect: () => setDetailDialogOpen(true),
				},
				{
					key: "product",
					label: "Voir le produit",
					icon: ExternalLink,
					href: `/creations/${review.product.slug}`,
					external: true,
				},
				{
					key: "reply",
					label: "Répondre",
					icon: MessageSquare,
					hidden: !!review.response,
					onSelect: () => setDetailDialogOpen(true),
				},
			],
		},
		{
			key: "moderation",
			items: [
				{
					key: "toggle",
					label: isPublished ? "Masquer" : "Publier",
					icon: isPublished ? EyeOff : Eye,
					variant: isPublished ? "destructive" : "default",
					onSelect: () => setModerateDialogOpen(true),
				},
			],
		},
	];

	return (
		<>
			<ResponsiveActionMenu open={open} onOpenChange={onOpenChange}>
				{!hideTrigger && (
					<ResponsiveActionMenuTrigger asChild>
						<Button
							variant="ghost"
							className="h-11 w-11 p-0 transition-transform active:scale-95"
							aria-label="Actions"
						>
							<EllipsisVertical className="h-4 w-4" aria-hidden="true" />
						</Button>
					</ResponsiveActionMenuTrigger>
				)}
				<ResponsiveActionMenuContent title="Actions avis" sections={sections} />
			</ResponsiveActionMenu>

			{detailDialogOpen && (
				<ReviewDetailDialog
					review={review}
					open={detailDialogOpen}
					onOpenChange={setDetailDialogOpen}
				/>
			)}

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
									<span className="font-semibold">{review.user.name ?? "Anonyme"}</span> sur &quot;
									{review.product.title}&quot; ne sera plus visible sur le site.
								</>
							) : (
								<>
									L&apos;avis de{" "}
									<span className="font-semibold">{review.user.name ?? "Anonyme"}</span> sur &quot;
									{review.product.title}&quot; sera visible sur le site.
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
									<LoaderCircle className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
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
	);
}
