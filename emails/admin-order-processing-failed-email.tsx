import { formatEuro } from "@/shared/utils/format-euro";
import { Button, Section, Text } from "@react-email/components";
import { EMAIL_CLASSES, EMAIL_COLORS, EMAIL_STYLES } from "./email-colors";
import { EmailCard } from "./_components/email-card";
import { EmailCTA } from "./_components/email-cta";
import { EmailHeading } from "./_components/email-heading";
import { EmailLayout } from "./_components/email-layout";
import { ErrorCodeBlock } from "./_components/error-code-block";
import { FlexRow } from "./_components/flex-row";

interface AdminOrderProcessingFailedEmailProps {
	orderNumber: string;
	customerEmail: string;
	total: number;
	errorMessage: string;
	paymentIntentId: string;
	dashboardUrl: string;
	stripeDashboardUrl: string;
}

export const AdminOrderProcessingFailedEmail = ({
	orderNumber,
	customerEmail,
	total,
	errorMessage,
	paymentIntentId,
	dashboardUrl,
	stripeDashboardUrl,
}: AdminOrderProcessingFailedEmailProps) => {
	return (
		<EmailLayout
			preview={`[URGENT] Paiement reçu — Échec traitement commande ${orderNumber}`}
			headerText="Échec traitement commande"
			footer={
				<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.tiny}>
					Le paiement a été encaissé mais la commande n'a pas pu être traitée. Une intervention
					manuelle est requise.
				</Text>
			}
		>
			<Section style={{ marginBottom: "24px", textAlign: "center" }}>
				<Text
					style={{
						...EMAIL_STYLES.text.small,
						color: EMAIL_COLORS.error,
						fontWeight: "bold",
					}}
				>
					Le client a payé mais sa commande n'a pas pu être traitée. Action manuelle requise
					immédiatement.
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
							Montant encaissé
						</Text>
					}
					right={
						<Text
							style={{
								margin: 0,
								fontSize: "14px",
								fontWeight: "bold",
								color: EMAIL_COLORS.primary,
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

			<Section style={{ marginBottom: "24px" }}>
				<EmailHeading level="h3" style={{ marginBottom: "8px" }}>
					Identifiants Stripe
				</EmailHeading>
				<EmailCard>
					<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.tiny}>
						Payment Intent ID
					</Text>
					<Text
						className={EMAIL_CLASSES.text.body}
						style={{
							margin: 0,
							marginTop: "4px",
							fontFamily: "monospace",
							fontSize: "12px",
							color: EMAIL_COLORS.text.primary,
						}}
					>
						{paymentIntentId}
					</Text>
				</EmailCard>
			</Section>

			<Section style={{ marginBottom: "12px", textAlign: "center" }}>
				<Button
					href={stripeDashboardUrl}
					className={EMAIL_CLASSES.button.primary}
					style={{
						...EMAIL_STYLES.button.primary,
						backgroundColor: EMAIL_COLORS.stripe,
					}}
				>
					Ouvrir Stripe
				</Button>
			</Section>
			<EmailCTA href={dashboardUrl}>Voir la commande</EmailCTA>
		</EmailLayout>
	);
};

AdminOrderProcessingFailedEmail.PreviewProps = {
	orderNumber: "SYN-20260310-X1Y2",
	customerEmail: "client@example.com",
	total: 12500,
	errorMessage: "Error: SKU sku_abc123 not found or inactive — cannot process order",
	paymentIntentId: "pi_3abc123def456ghi",
	dashboardUrl: "https://synclune.fr/admin/orders/clxxx12345",
	stripeDashboardUrl: "https://dashboard.stripe.com/payments/pi_3abc123def456ghi",
} as AdminOrderProcessingFailedEmailProps;

export default AdminOrderProcessingFailedEmail;
