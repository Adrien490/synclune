import { formatEuro } from "@/shared/utils/format-euro";
import { Section, Text } from "@react-email/components";
import { EMAIL_CLASSES, EMAIL_COLORS, EMAIL_STYLES } from "./email-colors";
import { EmailCard } from "./_components/email-card";
import { EmailCTA } from "./_components/email-cta";
import { EmailHeading } from "./_components/email-heading";
import { EmailLayout } from "./_components/email-layout";
import { ErrorCodeBlock } from "./_components/error-code-block";
import { FlexRow } from "./_components/flex-row";

interface AdminCheckoutFailedEmailProps {
	orderNumber: string;
	customerEmail: string;
	total: number;
	errorMessage: string;
	dashboardUrl: string;
}

export const AdminCheckoutFailedEmail = ({
	orderNumber,
	customerEmail,
	total,
	errorMessage,
	dashboardUrl,
}: AdminCheckoutFailedEmailProps) => {
	return (
		<EmailLayout
			preview={`Échec création session Stripe — Commande ${orderNumber}`}
			headerText="Échec checkout Stripe"
			footer={
				<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.tiny}>
					Vérifiez les logs Vercel et le dashboard Stripe pour plus d'informations.
				</Text>
			}
		>
			<Section style={{ marginBottom: "24px", textAlign: "center" }}>
				<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.small}>
					La création de la session Stripe Checkout a échoué. La commande a été nettoyée
					automatiquement.
				</Text>
			</Section>

			<EmailCard style={{ marginBottom: "24px" }}>
				<FlexRow
					style={{ marginBottom: "8px" }}
					left={
						<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.small}>
							Commande
						</Text>
					}
					right={
						<Text
							className={EMAIL_CLASSES.text.body}
							style={{
								margin: 0,
								fontFamily: "monospace",
								fontSize: "14px",
								fontWeight: "bold",
								color: EMAIL_COLORS.text.primary,
							}}
						>
							{orderNumber}
						</Text>
					}
				/>
				<FlexRow
					style={{ marginBottom: "8px" }}
					left={
						<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.small}>
							Client
						</Text>
					}
					right={
						<Text
							className={EMAIL_CLASSES.text.body}
							style={{
								margin: 0,
								fontSize: "14px",
								color: EMAIL_COLORS.text.primary,
							}}
						>
							{customerEmail}
						</Text>
					}
				/>
				<FlexRow
					left={
						<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.small}>
							Montant
						</Text>
					}
					right={
						<Text
							className={EMAIL_CLASSES.text.body}
							style={{
								margin: 0,
								fontSize: "14px",
								fontWeight: "bold",
								color: EMAIL_COLORS.text.primary,
							}}
						>
							{formatEuro(total)}
						</Text>
					}
				/>
			</EmailCard>

			<Section style={{ marginBottom: "24px" }}>
				<EmailHeading level="h3" style={{ marginBottom: "8px" }}>
					Erreur
				</EmailHeading>
				<ErrorCodeBlock error={errorMessage} />
			</Section>

			<EmailCTA href={dashboardUrl}>Voir le dashboard</EmailCTA>
		</EmailLayout>
	);
};

AdminCheckoutFailedEmail.PreviewProps = {
	orderNumber: "SYN-20260220-A1B2",
	customerEmail: "client@example.com",
	total: 8900,
	errorMessage: "StripeConnectionError: Could not connect to Stripe API after 2 retries",
	dashboardUrl: "https://synclune.fr/admin",
} as AdminCheckoutFailedEmailProps;

export default AdminCheckoutFailedEmail;
