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

interface ReturnConfirmationEmailProps {
	orderNumber: string;
	customerName: string;
	orderTotal: number;
	reason?: string;
	orderDetailsUrl: string;
}

export const ReturnConfirmationEmail = ({
	orderNumber,
	customerName,
	orderTotal,
	reason,
	orderDetailsUrl,
}: ReturnConfirmationEmailProps) => {
	return (
		<Html>
			<Head />
			<Preview>
				Retour enregistré pour votre commande {orderNumber}
			</Preview>
			<Tailwind config={emailTailwindConfig}>
				<Body className="bg-background font-sans">
					<Container className="mx-auto my-8 max-w-[600px] rounded-lg border border-border bg-card px-8 py-10">
						{/* Header */}
						<Section className="mb-8 text-center">
							<Text className="m-0 text-2xl font-bold text-foreground">
								Retour enregistré
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
								Nous avons bien reçu le retour de votre commande <strong>{orderNumber}</strong>.
							</Text>
							{reason && (
								<Text className="m-0 mt-2 text-base text-muted-foreground">
									Motif : {reason}
								</Text>
							)}
						</Section>

						{/* Détails */}
						<Section className="mb-8">
							<Text className="m-0 mb-3 text-lg font-semibold text-foreground">
								Récapitulatif
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
										Montant initial
									</Text>
									<Text className="m-0 font-mono text-sm text-foreground">
										{formatEuro(orderTotal)}
									</Text>
								</div>
								<div style={{ display: "flex", justifyContent: "space-between" }}>
									<Text className="m-0 text-sm font-medium text-muted-foreground">
										Statut du colis
									</Text>
									<Text className="m-0 text-sm font-bold" style={{ color: "#f59e0b" }}>
										Retourné
									</Text>
								</div>
							</div>
						</Section>

						{/* Information sur le remboursement */}
						<Section className="mb-8 rounded-md border border-border bg-muted/50 p-4">
							<Text className="m-0 text-sm font-bold text-foreground">
								Prochaines étapes
							</Text>
							<Text className="m-0 mt-2 text-sm text-muted-foreground">
								Notre équipe va examiner votre retour. Si un remboursement est prévu,
								vous recevrez un email de confirmation dès qu'il sera effectué.
								Le traitement prend généralement <strong>2 à 5 jours ouvrés</strong>.
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
								Une question sur votre retour ? Notre équipe est à votre disposition à{" "}
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

ReturnConfirmationEmail.PreviewProps = {
	orderNumber: "CMD-2024-ABCD1234",
	customerName: "Marie",
	orderTotal: 8990,
	reason: "Colis retourné par le client",
	orderDetailsUrl: "https://synclune.fr/compte/commandes/CMD-2024-ABCD1234",
} as ReturnConfirmationEmailProps;

export default ReturnConfirmationEmail;
