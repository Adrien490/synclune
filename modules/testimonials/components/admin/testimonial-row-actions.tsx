"use client"

import { Button } from "@/shared/components/ui/button"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import { useDialog } from "@/shared/providers/dialog-store-provider"
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider"
import { useTogglePublish } from "../../hooks/use-toggle-publish"
import { TESTIMONIAL_DIALOG_ID } from "./testimonial-form-dialog"
import { DELETE_TESTIMONIAL_DIALOG_ID } from "./delete-testimonial-alert-dialog"
import { Eye, EyeOff, MoreVertical, Pencil, Trash2 } from "lucide-react"

interface TestimonialRowActionsProps {
	testimonial: {
		id: string
		authorName: string
		content: string
		imageUrl: string | null
		isPublished: boolean
	}
}

export function TestimonialRowActions({ testimonial }: TestimonialRowActionsProps) {
	const editDialog = useDialog(TESTIMONIAL_DIALOG_ID)
	const deleteDialog = useAlertDialog(DELETE_TESTIMONIAL_DIALOG_ID)
	const { action: toggleAction, isPending } = useTogglePublish()

	const handleEdit = () => {
		editDialog.open({
			testimonial: {
				id: testimonial.id,
				authorName: testimonial.authorName,
				content: testimonial.content,
				imageUrl: testimonial.imageUrl,
				isPublished: testimonial.isPublished,
			},
		})
	}

	const handleDelete = () => {
		deleteDialog.open({
			testimonialId: testimonial.id,
			authorName: testimonial.authorName,
		})
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="sm" className="h-8 w-8 p-0">
					<span className="sr-only">Ouvrir le menu</span>
					<MoreVertical className="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-[180px]">
				<DropdownMenuItem onClick={handleEdit}>
					<Pencil className="h-4 w-4" />
					Modifier
				</DropdownMenuItem>

				<form action={toggleAction}>
					<input type="hidden" name="id" value={testimonial.id} />
					<input
						type="hidden"
						name="isPublished"
						value={testimonial.isPublished ? "false" : "true"}
					/>
					<DropdownMenuItem asChild>
						<button
							type="submit"
							disabled={isPending}
							className="w-full"
						>
							{testimonial.isPublished ? (
								<>
									<EyeOff className="h-4 w-4" />
									Dépublier
								</>
							) : (
								<>
									<Eye className="h-4 w-4" />
									Publier
								</>
							)}
						</button>
					</DropdownMenuItem>
				</form>

				<DropdownMenuSeparator />

				<DropdownMenuItem
					onClick={handleDelete}
					variant="destructive"
				>
					<Trash2 className="h-4 w-4" />
					Supprimer
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
