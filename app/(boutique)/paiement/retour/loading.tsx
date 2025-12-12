import { Spinner } from "@/shared/components/ui/spinner"

/**
 * État de chargement pendant la vérification du paiement
 */
export default function CheckoutReturnLoading() {
	return (
		<div className="min-h-screen flex items-center justify-center">
			<div className="text-center space-y-4">
				<Spinner className="w-8 h-8 mx-auto" />
				<p className="text-muted-foreground">
					Vérification de votre paiement...
				</p>
			</div>
		</div>
	)
}
