"use client";

import { Button } from "@/shared/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
	Ban,
	Eye,
	MoreVertical,
	Pencil,
	RotateCcw,
	Trash2,
} from "lucide-react";
import Link from "next/link";

interface UsersRowActionsProps {
	user: {
		id: string;
		name: string;
		email: string;
		deletedAt: Date | null;
	};
}

export function UsersRowActions({ user }: UsersRowActionsProps) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" className="h-8 w-8 p-0" aria-label="Actions">
					<MoreVertical className="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem asChild>
					<Link
						href={`/dashboard/users/${user.id}`}
						className="flex items-center cursor-pointer"
					>
						<Eye className="mr-2 h-4 w-4" />
						Voir profil
					</Link>
				</DropdownMenuItem>
				<DropdownMenuItem asChild>
					<Link
						href={`/dashboard/users/${user.id}/edit`}
						className="flex items-center cursor-pointer"
					>
						<Pencil className="mr-2 h-4 w-4" />
						Éditer
					</Link>
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				{!user.deletedAt ? (
					<>
						<DropdownMenuItem
							className="flex items-center cursor-pointer"
							onClick={() => {
								// TODO: Implémenter la suspension
							}}
						>
							<Ban className="mr-2 h-4 w-4" />
							Suspendre
						</DropdownMenuItem>
						<DropdownMenuItem
							className="flex items-center cursor-pointer text-destructive focus:text-destructive"
							onClick={() => {
								// TODO: Implémenter la suppression (soft delete)
							}}
						>
							<Trash2 className="mr-2 h-4 w-4" />
							Supprimer
						</DropdownMenuItem>
					</>
				) : (
					<DropdownMenuItem
						className="flex items-center cursor-pointer"
						onClick={() => {
							// TODO: Implémenter la restauration
						}}
					>
						<RotateCcw className="mr-2 h-4 w-4" />
						Restaurer
					</DropdownMenuItem>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
