"use client";

import { Eye, EyeOff, LoaderCircle } from "lucide-react";

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
		<AlertDialog open={dialog.isOpen} onOpenChange={(o) => !o && dialog.close()}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>
						{isPublished ? "Masquer cet avis ?" : "Publier cet avis ?"}
					</AlertDialogTitle>
					<AlertDialogDescription>
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
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
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
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
