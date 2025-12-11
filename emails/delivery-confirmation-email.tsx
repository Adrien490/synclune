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

interface DeliveryConfirmationEmailProps {
	orderNumber: string;
	customerName: string;
	deliveryDate: string;
	orderDetailsUrl: string;
}

export const DeliveryConfirmationEmail = ({
	orderNumber,
	customerName,
	deliveryDate,
	orderDetailsUrl,
}: DeliveryConfirmationEmailProps) => {
	return (
		<Html>
			<Head />
			<Preview>Commande {orderNumber} livrée</Preview>
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
						<Text style={EMAIL_STYLES.heading.h2}>Commande livrée</Text>
						<Text style={{ ...EMAIL_STYLES.text.body, marginTop: "12px" }}>
							Bonjour {customerName}, ta commande {orderNumber} a été livrée le{" "}
							{deliveryDate}.
						</Text>
					</Section>

					{/* CTA */}
					<Section style={{ marginBottom: "32px", textAlign: "center" }}>
						<Button href={orderDetailsUrl} style={EMAIL_STYLES.button.primary}>
							Voir ma commande
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

DeliveryConfirmationEmail.PreviewProps = {
	orderNumber: "CMD-1730000000-ABCD",
	customerName: "Marie",
	deliveryDate: "27 novembre 2025",
	orderDetailsUrl: "https://synclune.fr/compte/commandes/CMD-1730000000-ABCD",
} as DeliveryConfirmationEmailProps;

export default DeliveryConfirmationEmail;
