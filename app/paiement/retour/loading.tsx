import { Spinner } from "@/shared/components/ui/spinner";

/**
 * État de chargement pendant la vérification du paiement
 */
export default function CheckoutReturnLoading() {
	return (
		<div className="flex min-h-screen items-center justify-center">
			<div className="space-y-4 text-center">
				<Spinner className="mx-auto h-8 w-8" />
				<p className="text-muted-foreground">Vérification de votre paiement...</p>
			</div>
		</div>
	);
}
