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

interface RevertShippingNotificationEmailProps {
	orderNumber: string;
	customerName: string;
	reason: string;
	orderDetailsUrl: string;
}

export const RevertShippingNotificationEmail = ({
	orderNumber,
	customerName,
	reason,
	orderDetailsUrl,
}: RevertShippingNotificationEmailProps) => {
	return (
		<Html>
			<Head />
			<Preview>
				Mise à jour de l'expédition - {orderNumber}
			</Preview>
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
						<Text style={EMAIL_STYLES.heading.h2}>Expédition mise à jour</Text>
						<Text style={{ ...EMAIL_STYLES.text.body, marginTop: "12px" }}>
							Bonjour {customerName}, le précédent numéro de suivi de ta commande{" "}
							{orderNumber} n'est plus valide. Ta commande est de nouveau en
							préparation.
						</Text>
					</Section>

					{/* Raison */}
					<Section style={{ marginBottom: "24px" }}>
						<div style={EMAIL_STYLES.section.card}>
							<Text style={{ ...EMAIL_STYLES.text.small, fontWeight: "600" }}>
								Motif
							</Text>
							<Text
								style={{
									margin: 0,
									marginTop: "4px",
									fontSize: "14px",
									color: EMAIL_COLORS.text.primary,
								}}
							>
								{reason}
							</Text>
						</div>
					</Section>

					{/* Info */}
					<Section style={{ ...EMAIL_STYLES.section.card, marginBottom: "24px" }}>
						<Text style={EMAIL_STYLES.text.small}>
							Tu recevras un nouvel email avec les informations de suivi dès que
							le colis sera réexpédié.
						</Text>
					</Section>

					{/* CTA */}
					<Section style={{ marginBottom: "32px", textAlign: "center" }}>
						<Button href={orderDetailsUrl} style={EMAIL_STYLES.button.primary}>
							Suivre ma commande
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

RevertShippingNotificationEmail.PreviewProps = {
	orderNumber: "CMD-2024-ABCD1234",
	customerName: "Marie",
	reason: "Erreur d'étiquetage du transporteur",
	orderDetailsUrl: "https://synclune.fr/compte/commandes/CMD-2024-ABCD1234",
} as RevertShippingNotificationEmailProps;

export default RevertShippingNotificationEmail;
