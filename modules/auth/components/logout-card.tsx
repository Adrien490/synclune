"use client";

import { SignOutIcon } from "@phosphor-icons/react/ssr";
import { Button } from "@/shared/components/ui/button";
import { LogoutAlertDialog } from "./logout-alert-dialog";

export function LogoutCard() {
	return (
		<section className="space-y-4" aria-labelledby="logout-heading">
			<h2 id="logout-heading" className="text-base font-semibold">
				Déconnexion
			</h2>
			<div className="border-border/60 border-t pt-4">
				<LogoutAlertDialog>
					<Button variant="outline" className="w-full">
						<SignOutIcon className="mr-2 size-4" />
						Se déconnecter
					</Button>
				</LogoutAlertDialog>
			</div>
		</section>
	);
}
