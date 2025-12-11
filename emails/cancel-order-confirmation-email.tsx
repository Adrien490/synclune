import { formatEuro } from "@/shared/utils/format-euro";
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

interface CancelOrderConfirmationEmailProps {
	orderNumber: string;
	customerName: string;
	orderTotal: number;
	reason?: string;
	wasRefunded: boolean;
	orderDetailsUrl: string;
}

export const CancelOrderConfirmationEmail = ({
	orderNumber,
	customerName,
	orderTotal,
	reason,
	wasRefunded,
	orderDetailsUrl,
}: CancelOrderConfirmationEmailProps) => {
	return (
		<Html>
			<Head />
			<Preview>Commande {orderNumber} annulée</Preview>
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
						<Text style={EMAIL_STYLES.heading.h2}>Commande annulée</Text>
						<Text style={{ ...EMAIL_STYLES.text.body, marginTop: "12px" }}>
							Bonjour {customerName}, ta commande {orderNumber} a été annulée.
							{reason && ` Raison : ${reason}`}
						</Text>
					</Section>

					{/* Détails */}
					<Section style={{ marginBottom: "24px" }}>
						<div style={EMAIL_STYLES.section.card}>
							<div
								style={{
									display: "flex",
									justifyContent: "space-between",
									marginBottom: "8px",
								}}
							>
								<Text style={EMAIL_STYLES.text.small}>Commande</Text>
								<Text
									style={{
										margin: 0,
										fontFamily: "monospace",
										fontSize: "14px",
										fontWeight: "600",
										color: EMAIL_COLORS.text.primary,
									}}
								>
									{orderNumber}
								</Text>
							</div>
							<div
								style={{
									display: "flex",
									justifyContent: "space-between",
								}}
							>
								<Text style={EMAIL_STYLES.text.small}>Montant</Text>
								<Text
									style={{
										margin: 0,
										fontFamily: "monospace",
										fontSize: "14px",
										color: EMAIL_COLORS.text.primary,
									}}
								>
									{formatEuro(orderTotal)}
								</Text>
							</div>
						</div>
					</Section>

					{/* Info remboursement */}
					{wasRefunded && (
						<Section
							style={{ ...EMAIL_STYLES.section.card, marginBottom: "24px" }}
						>
							<Text
								style={{
									...EMAIL_STYLES.text.body,
									margin: 0,
									fontWeight: "600",
								}}
							>
								Remboursement
							</Text>
							<Text style={{ ...EMAIL_STYLES.text.small, marginTop: "8px" }}>
								Le remboursement de {formatEuro(orderTotal)} sera crédité sous 3
								à 10 jours ouvrés.
							</Text>
						</Section>
					)}

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

CancelOrderConfirmationEmail.PreviewProps = {
	orderNumber: "CMD-2024-ABCD1234",
	customerName: "Marie",
	orderTotal: 8990,
	reason: "Demande client",
	wasRefunded: true,
	orderDetailsUrl: "https://synclune.fr/compte/commandes/CMD-2024-ABCD1234",
} as CancelOrderConfirmationEmailProps;

export default CancelOrderConfirmationEmail;
