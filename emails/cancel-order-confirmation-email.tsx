import { formatEuro } from "@/shared/utils/format-euro";
import { Section, Text } from "react-email";
import { EMAIL_CLASSES, EMAIL_STYLES, REFUND_DELAY_TEXT } from "./email-colors";
import { EmailCard } from "./_components/email-card";
import { EmailCTA } from "./_components/email-cta";
import { EmailHeading } from "./_components/email-heading";
import { EmailLayout } from "./_components/email-layout";
import { EmailSummaryRow } from "./_components/email-summary-row";

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
			<Section style={{ marginBottom: "24px" }}>
				<EmailHeading level="h1">Commande annulée</EmailHeading>
				<Text
					className={EMAIL_CLASSES.text.body}
					style={{ ...EMAIL_STYLES.text.body, marginTop: "12px" }}
				>
					Bonjour {customerName}, votre commande {orderNumber} a été annulée.
					{reason && ` Raison : ${reason}`}
				</Text>
			</Section>

			<EmailCard style={{ marginBottom: "24px" }}>
				<EmailSummaryRow
					style={{ marginBottom: "8px" }}
					label="Commande"
					value={orderNumber}
					variant="mono"
				/>
				<EmailSummaryRow label="Montant" value={formatEuro(orderTotal)} variant="mono" />
			</EmailCard>

			{wasRefunded && (
				<EmailCard style={{ marginBottom: "24px" }}>
					<Text
						className={EMAIL_CLASSES.text.body}
						style={{
							...EMAIL_STYLES.text.body,
							margin: 0,
							fontWeight: "600",
						}}
					>
						Remboursement
					</Text>
					<Text
						className={EMAIL_CLASSES.text.secondary}
						style={{ ...EMAIL_STYLES.text.small, marginTop: "8px" }}
					>
						Le remboursement de {formatEuro(orderTotal)} sera crédité sous {REFUND_DELAY_TEXT}.
					</Text>
				</EmailCard>
			)}

			<EmailCTA href={orderDetailsUrl}>Voir ma commande</EmailCTA>
		</EmailLayout>
	);
};

CancelOrderConfirmationEmail.PreviewProps = {
	orderNumber: "CMD-2024-ABCD1234",
	customerName: "Marie",
	orderTotal: 8990,
	reason: "Demande client",
	wasRefunded: true,
	orderDetailsUrl:
		"https://synclune.fr/suivi-commande?commande=CMD-2024-ABCD1234&token=abc123def456abc123def456abc12345",
} as CancelOrderConfirmationEmailProps;

export default CancelOrderConfirmationEmail;
