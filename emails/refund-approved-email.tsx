import { formatEuro } from "@/shared/utils/format-euro";
import {
	Body,
	Button,
	Container,
	Head,
	Html,
	Preview,
	Section,
	Tailwind,
	Text,
} from "@react-email/components";
import { emailTailwindConfig } from "./email-tailwind-config";

interface RefundApprovedEmailProps {
	orderNumber: string;
	customerName: string;
	refundAmount: number;
	originalOrderTotal: number;
	reason: string;
	isPartialRefund: boolean;
	orderDetailsUrl: string;
}

const reasonLabels: Record<string, string> = {
	CUSTOMER_REQUEST: "Demande client (droit de rétractation)",
	DEFECTIVE: "Produit défectueux",
	WRONG_ITEM: "Erreur de commande",
	LOST_IN_TRANSIT: "Colis perdu",
	FRAUD: "Transaction contestée",
	OTHER: "Autre raison",
};

export const RefundApprovedEmail = ({
	orderNumber,
	customerName,
	refundAmount,
	originalOrderTotal,
	reason,
	isPartialRefund,
	orderDetailsUrl,
}: RefundApprovedEmailProps) => {
	const reasonLabel = reasonLabels[reason] || reason;

	return (
		<Html>
			<Head />
			<Preview>
				Votre demande de remboursement de {formatEuro(refundAmount)} a été acceptée - Commande {orderNumber}
			</Preview>
			<Tailwind config={emailTailwindConfig}>
				<Body className="bg-background font-sans">
					<Container className="mx-auto my-8 max-w-[600px] rounded-lg border border-border bg-card px-8 py-10">
						{/* Header */}
						<Section className="mb-8 text-center">
							<Text className="m-0 text-2xl font-bold text-foreground">
								Demande de remboursement acceptée
							</Text>
							<Text className="m-0 mt-2 text-sm text-muted-foreground">
								Commande {orderNumber}
							</Text>
						</Section>

						{/* Message principal */}
						<Section className="mb-8">
							<Text className="m-0 text-base text-foreground">
								Bonjour {customerName},
							</Text>
							<Text className="m-0 mt-4 text-base text-foreground">
								Nous avons le plaisir de vous informer que votre demande de remboursement
								a été <strong>acceptée</strong>. Le remboursement sera traité dans les
								prochains jours ouvrés.
							</Text>
						</Section>

						{/* Détails du remboursement */}
						<Section className="mb-8">
							<Text className="m-0 mb-3 text-lg font-semibold text-foreground">
								Détails du remboursement
							</Text>
							<div className="rounded-md bg-muted p-4">
								<div
									style={{
										display: "flex",
										justifyContent: "space-between",
										marginBottom: "8px",
									}}
								>
									<Text className="m-0 text-sm font-medium text-muted-foreground">
										Numéro de commande
									</Text>
									<Text className="m-0 font-mono text-sm font-bold text-foreground">
										{orderNumber}
									</Text>
								</div>
								<div
									style={{
										display: "flex",
										justifyContent: "space-between",
										marginBottom: "8px",
									}}
								>
									<Text className="m-0 text-sm font-medium text-muted-foreground">
										Montant à rembourser
									</Text>
									<Text className="m-0 font-mono text-sm font-bold" style={{ color: "#3b82f6" }}>
										{formatEuro(refundAmount)}
									</Text>
								</div>
								{isPartialRefund && (
									<div
										style={{
											display: "flex",
											justifyContent: "space-between",
											marginBottom: "8px",
										}}
									>
										<Text className="m-0 text-sm font-medium text-muted-foreground">
											Montant initial
										</Text>
										<Text className="m-0 font-mono text-sm text-foreground">
											{formatEuro(originalOrderTotal)}
										</Text>
									</div>
								)}
								<div style={{ display: "flex", justifyContent: "space-between" }}>
									<Text className="m-0 text-sm font-medium text-muted-foreground">
										Raison
									</Text>
									<Text className="m-0 text-sm text-foreground">
										{reasonLabel}
									</Text>
								</div>
							</div>
						</Section>

						{/* Information sur les prochaines étapes */}
						<Section className="mb-8 rounded-md border border-border bg-muted/50 p-4">
							<Text className="m-0 text-sm font-bold text-foreground">
								Prochaines étapes
							</Text>
							<Text className="m-0 mt-2 text-sm text-muted-foreground">
								Le remboursement sera initié prochainement. Une fois effectué, vous
								recevrez un email de confirmation et le montant sera crédité sur
								votre compte sous <strong>3 à 10 jours ouvrés</strong>.
							</Text>
						</Section>

						{/* Bouton */}
						<Section className="mb-8 text-center">
							<Button
								href={orderDetailsUrl}
								style={{ backgroundColor: "#D4A574" }}
								className="inline-block rounded-md px-8 py-4 text-base font-semibold text-white no-underline"
							>
								Voir ma commande
							</Button>
						</Section>

						{/* Contact */}
						<Section className="mb-6 rounded-md border border-border bg-muted/30 p-4">
							<Text className="m-0 text-sm text-foreground">
								Une question ? Notre équipe est à votre disposition à{" "}
								<a
									href="mailto:contact@synclune.fr"
									className="text-primary underline"
								>
									contact@synclune.fr
								</a>
							</Text>
						</Section>

						{/* Footer */}
						<Section className="border-t pt-6" style={{ borderColor: "#E8E8E8" }}>
							<Text className="m-0 text-center text-xs text-muted-foreground">
								Merci de votre confiance.
								<br />
								L'équipe Synclune
							</Text>
						</Section>
					</Container>
				</Body>
			</Tailwind>
		</Html>
	);
};

RefundApprovedEmail.PreviewProps = {
	orderNumber: "CMD-2024-ABCD1234",
	customerName: "Marie",
	refundAmount: 8990,
	originalOrderTotal: 8990,
	reason: "CUSTOMER_REQUEST",
	isPartialRefund: false,
	orderDetailsUrl: "https://synclune.fr/mon-compte/commandes/CMD-2024-ABCD1234",
} as RefundApprovedEmailProps;

export default RefundApprovedEmail;
