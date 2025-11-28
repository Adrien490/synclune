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

interface PaymentFailedEmailProps {
	orderNumber: string;
	customerName: string;
	retryUrl: string;
}

export const PaymentFailedEmail = ({
	orderNumber,
	customerName,
	retryUrl,
}: PaymentFailedEmailProps) => {
	return (
		<Html>
			<Head />
			<Preview>
				Échec de votre paiement pour la commande {orderNumber} - Action requise
			</Preview>
			<Tailwind config={emailTailwindConfig}>
				<Body className="bg-background font-sans">
					<Container className="mx-auto my-8 max-w-[600px] rounded-lg border border-border bg-card px-8 py-10">
						{/* Header */}
						<Section className="mb-8 text-center">
							<Text className="m-0 text-2xl font-bold text-foreground">
								Échec de votre paiement
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
								Nous n'avons malheureusement pas pu traiter votre paiement pour
								la commande <strong>{orderNumber}</strong>.
							</Text>
							<Text className="m-0 mt-4 text-base text-foreground">
								Cela peut être dû à un solde insuffisant, un rejet bancaire ou
								un problème technique temporaire.
							</Text>
						</Section>

						{/* Alerte */}
						<Section className="mb-8 rounded-md border border-border bg-muted/50 p-4">
							<Text className="m-0 text-sm font-bold text-foreground">
								Votre commande a été annulée
							</Text>
							<Text className="m-0 mt-2 text-sm text-muted-foreground">
								Les articles ont été remis en stock. Si vous souhaitez toujours
								passer commande, vous pouvez recommencer le processus d'achat.
							</Text>
						</Section>

						{/* Bouton */}
						<Section className="mb-8 text-center">
							<Button
								href={retryUrl}
								style={{ backgroundColor: "#D4A574" }}
								className="inline-block rounded-md px-8 py-4 text-base font-semibold text-white no-underline"
							>
								Retourner à la boutique
							</Button>
						</Section>

						{/* Information complémentaire */}
						<Section className="mb-8">
							<Text className="m-0 text-sm text-muted-foreground">
								Si vous pensez qu'il s'agit d'une erreur ou si vous avez des
								questions, n'hésitez pas à nous contacter.
							</Text>
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
								Nous vous remercions de votre compréhension.
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

PaymentFailedEmail.PreviewProps = {
	orderNumber: "CMD-2024-ABCD1234",
	customerName: "Marie",
	retryUrl: "https://synclune.fr/creations",
} as PaymentFailedEmailProps;

export default PaymentFailedEmail;
