"use client";

import { Eye, EyeOff, LoaderCircle } from "lucide-react";

import {
	ResponsiveAlertDialog,
	ResponsiveAlertDialogCancel,
	ResponsiveAlertDialogContent,
	ResponsiveAlertDialogDescription,
	ResponsiveAlertDialogFooter,
	ResponsiveAlertDialogHeader,
	ResponsiveAlertDialogTitle,
} from "@/shared/components/ui/responsive-alert-dialog";
import { Button } from "@/shared/components/ui/button";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";

import { useReviewModeration } from "../../hooks/use-review-moderation";

export const TOGGLE_REVIEW_STATUS_DIALOG_ID = "toggle-review-status";

export interface ToggleReviewStatusDialogData {
	reviewId: string;
	authorName: string;
	productTitle: string;
	isPublished: boolean;
	[key: string]: unknown;
}

export function ToggleReviewStatusAlertDialog() {
	const dialog = useAlertDialog<ToggleReviewStatusDialogData>(TOGGLE_REVIEW_STATUS_DIALOG_ID);
	const { toggleStatus, isPending } = useReviewModeration({
		onSuccess: () => dialog.close(),
	});

	const data = dialog.data;
	const isPublished = data?.isPublished ?? false;

	return (
		<ResponsiveAlertDialog open={dialog.isOpen} onOpenChange={(o) => !o && dialog.close()}>
			<ResponsiveAlertDialogContent>
				<ResponsiveAlertDialogHeader>
					<ResponsiveAlertDialogTitle>
						{isPublished ? "Masquer cet avis ?" : "Publier cet avis ?"}
					</ResponsiveAlertDialogTitle>
					<ResponsiveAlertDialogDescription>
						{data ? (
							isPublished ? (
								<>
									L&apos;avis de <span className="font-semibold">{data.authorName}</span> sur &quot;
									{data.productTitle}&quot; ne sera plus visible sur le site.
								</>
							) : (
								<>
									L&apos;avis de <span className="font-semibold">{data.authorName}</span> sur &quot;
									{data.productTitle}&quot; sera visible sur le site.
								</>
							)
						) : null}
					</ResponsiveAlertDialogDescription>
				</ResponsiveAlertDialogHeader>
				<ResponsiveAlertDialogFooter>
					<ResponsiveAlertDialogCancel disabled={isPending}>Annuler</ResponsiveAlertDialogCancel>
					<Button
						onClick={() => data && toggleStatus(data.reviewId)}
						disabled={isPending || !data}
						variant={isPublished ? "destructive" : "default"}
					>
						{isPending ? (
							<>
								<LoaderCircle className="mr-2 size-4 animate-spin" aria-hidden="true" />
								{isPublished ? "Masquage…" : "Publication…"}
							</>
						) : isPublished ? (
							<>
								<EyeOff className="mr-2 size-4" aria-hidden="true" />
								Masquer
							</>
						) : (
							<>
								<Eye className="mr-2 size-4" aria-hidden="true" />
								Publier
							</>
						)}
					</Button>
				</ResponsiveAlertDialogFooter>
			</ResponsiveAlertDialogContent>
		</ResponsiveAlertDialog>
	);
}
