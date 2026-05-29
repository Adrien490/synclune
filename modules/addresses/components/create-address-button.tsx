"use client";

import { Button } from "@/shared/components/ui/button";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { ADDRESS_DIALOG_ID } from "../constants/dialog.constants";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";

const NEW_ADDRESS_PATH = "/adresses/nouvelle";

type CreateAddressButtonProps = Omit<ComponentProps<typeof Button>, "onClick">;

export function CreateAddressButton({ children, ...props }: CreateAddressButtonProps) {
	const dialog = useDialog(ADDRESS_DIALOG_ID);
	const isMobile = useIsMobile();
	const router = useRouter();

	// Mobile : page dédiée pleine largeur (parité formulaires admin).
	// Desktop : dialog en overlay (comportement historique conservé).
	const handleClick = () => {
		if (isMobile) {
			router.push(NEW_ADDRESS_PATH);
			return;
		}
		dialog.open();
	};

	return (
		<Button onClick={handleClick} {...props}>
			{children ?? (
				<>
					<Plus className="mr-2 size-4" />
					Ajouter une adresse
				</>
			)}
		</Button>
	);
}
