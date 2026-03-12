"use client";

import { LogOut } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { LogoutAlertDialog } from "./logout-alert-dialog";

export function LogoutCard() {
	return (
		<section className="space-y-4" aria-labelledby="logout-heading">
			<div>
				<h2 id="logout-heading" className="text-base font-semibold">
					Déconnexion
				</h2>
				<p className="text-muted-foreground mt-0.5 text-sm">Se déconnecter de votre compte</p>
			</div>
			<div className="border-border/60 border-t pt-4">
				<LogoutAlertDialog>
					<Button variant="outline" className="w-full">
						<LogOut className="mr-2 size-4" />
						Se déconnecter
					</Button>
				</LogoutAlertDialog>
			</div>
		</section>
	);
}
