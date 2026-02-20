import { formatEuro } from "@/shared/utils/format-euro";
import { Button, Section, Text } from "@react-email/components";
import { EMAIL_COLORS, EMAIL_STYLES } from "./email-colors";
import { EmailLayout } from "./_components/email-layout";
import { FlexRow } from "./_components/flex-row";

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
		<EmailLayout preview={`Retour enregistré - ${orderNumber}`}>
			{/* Titre */}
			<Section style={{ marginBottom: "24px" }}>
				<Text style={EMAIL_STYLES.heading.h2}>Retour enregistré</Text>
				<Text style={{ ...EMAIL_STYLES.text.body, marginTop: "12px" }}>
					Bonjour {customerName}, le retour de votre commande {orderNumber} a
					été enregistré.{reason && ` Motif : ${reason}`}
				</Text>
			</Section>

			{/* Détails */}
			<Section style={{ marginBottom: "24px" }}>
				<Section style={EMAIL_STYLES.section.card}>
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
						left={<Text style={EMAIL_STYLES.text.small}>Montant initial</Text>}
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
				</Section>
			</Section>

			{/* Info */}
			<Section style={{ ...EMAIL_STYLES.section.card, marginBottom: "24px" }}>
				<Text style={EMAIL_STYLES.text.small}>
					Le retour sera examiné sous 2 à 5 jours ouvrés. Vous recevrez un
					email de confirmation si un remboursement est prévu.
				</Text>
			</Section>

			{/* CTA */}
			<Section style={{ marginBottom: "32px", textAlign: "center" }}>
				<Button href={orderDetailsUrl} style={EMAIL_STYLES.button.primary}>
					Voir ma commande
				</Button>
			</Section>
		</EmailLayout>
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
