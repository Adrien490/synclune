import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
import { Separator } from "@/shared/components/ui/separator";
import { ExportDataButton } from "./export-data-button";
import { DeleteAccountDialog } from "./delete-account-dialog";
import { Shield } from "lucide-react";

export function GdprSection() {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Shield className="w-5 h-5" />
					Données personnelles
				</CardTitle>
				<CardDescription>
					Gérez vos données conformément au RGPD (Règlement Général sur la
					Protection des Données)
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				{/* Export */}
				<div>
					<h4 className="font-medium mb-2">Droit à la portabilité</h4>
					<ExportDataButton />
				</div>

				<Separator />

				{/* Suppression */}
				<div>
					<h4 className="font-medium mb-2">Droit à l&apos;oubli</h4>
					<p className="text-sm text-muted-foreground mb-4">
						Supprimez définitivement votre compte et toutes vos données
						personnelles. Cette action est irréversible.
					</p>
					<DeleteAccountDialog />
				</div>
			</CardContent>
		</Card>
	);
}
