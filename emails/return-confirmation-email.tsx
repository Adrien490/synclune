import { formatEuro } from "@/shared/utils/format-euro";
import { Section, Text } from "@react-email/components";
import { EMAIL_CLASSES, EMAIL_STYLES } from "./email-colors";
import { EmailCard } from "./_components/email-card";
import { EmailCTA } from "./_components/email-cta";
import { EmailHeading } from "./_components/email-heading";
import { EmailLayout } from "./_components/email-layout";
import { EmailSummaryRow } from "./_components/email-summary-row";

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
			<Section style={{ marginBottom: "24px" }}>
				<EmailHeading level="h1">Retour enregistré</EmailHeading>
				<Text
					className={EMAIL_CLASSES.text.body}
					style={{ ...EMAIL_STYLES.text.body, marginTop: "12px" }}
				>
					Bonjour {customerName}, le retour de votre commande {orderNumber} a été enregistré.
					{reason && ` Motif : ${reason}`}
				</Text>
			</Section>

			<EmailCard style={{ marginBottom: "24px" }}>
				<EmailSummaryRow
					style={{ marginBottom: "8px" }}
					label="Commande"
					value={orderNumber}
					variant="mono"
				/>
				<EmailSummaryRow label="Montant initial" value={formatEuro(orderTotal)} variant="mono" />
			</EmailCard>

			<EmailCard style={{ marginBottom: "24px" }}>
				<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.small}>
					Le retour sera examiné sous 2 à 5 jours ouvrés. Vous recevrez un email de confirmation si
					un remboursement est prévu.
				</Text>
			</EmailCard>

			<EmailCTA href={orderDetailsUrl}>Voir ma commande</EmailCTA>
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
