import { formatEuro } from "@/shared/utils/format-euro";
import { Button, Section, Text } from "@react-email/components";
import { EMAIL_COLORS, EMAIL_STYLES } from "./email-colors";
import { EmailLayout } from "./_components/email-layout";
import { FlexRow } from "./_components/flex-row";

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
		<EmailLayout preview={`Commande ${orderNumber} annulée`}>
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
					<FlexRow
						style={{ marginBottom: "8px" }}
						left={<Text style={EMAIL_STYLES.text.small}>Commande</Text>}
						right={
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
						}
					/>
					<FlexRow
						left={<Text style={EMAIL_STYLES.text.small}>Montant</Text>}
						right={
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
						}
					/>
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
		</EmailLayout>
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
