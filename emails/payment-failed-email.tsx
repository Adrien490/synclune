import {
	Body,
	Button,
	Container,
	Head,
	Html,
	Preview,
	Section,
	Text,
} from "@react-email/components";
import { EMAIL_COLORS, EMAIL_STYLES } from "./email-colors";

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
			<Preview>Échec du paiement - {orderNumber}</Preview>
			<Body style={{ backgroundColor: EMAIL_COLORS.background.main }}>
				<Container style={EMAIL_STYLES.container}>
					{/* Header */}
					<Section style={{ marginBottom: "32px", textAlign: "center" }}>
						<Text
							style={{
								margin: 0,
								fontSize: "24px",
								fontWeight: "bold",
								color: EMAIL_COLORS.primary,
							}}
						>
							Synclune
						</Text>
					</Section>

					{/* Titre */}
					<Section style={{ marginBottom: "24px" }}>
						<Text style={EMAIL_STYLES.heading.h2}>Paiement échoué</Text>
						<Text style={{ ...EMAIL_STYLES.text.body, marginTop: "12px" }}>
							Bonjour {customerName}, le paiement de ta commande {orderNumber} a
							échoué. Les articles ont été remis en stock.
						</Text>
					</Section>

					{/* Info */}
					<Section style={{ ...EMAIL_STYLES.section.card, marginBottom: "24px" }}>
						<Text style={EMAIL_STYLES.text.small}>
							Cela peut être dû à un solde insuffisant, un rejet bancaire ou un
							problème technique.
						</Text>
					</Section>

					{/* CTA */}
					<Section style={{ marginBottom: "32px", textAlign: "center" }}>
						<Button href={retryUrl} style={EMAIL_STYLES.button.primary}>
							Retourner à la boutique
						</Button>
					</Section>

					{/* Footer */}
					<Section
						style={{
							paddingTop: "24px",
							borderTop: `1px solid ${EMAIL_COLORS.border}`,
							textAlign: "center",
						}}
					>
						<Text style={EMAIL_STYLES.text.tiny}>
							© {new Date().getFullYear()} Synclune
						</Text>
					</Section>
				</Container>
			</Body>
		</Html>
	);
};

PaymentFailedEmail.PreviewProps = {
	orderNumber: "CMD-2024-ABCD1234",
	customerName: "Marie",
	retryUrl: "https://synclune.fr/creations",
} as PaymentFailedEmailProps;

export default PaymentFailedEmail;
