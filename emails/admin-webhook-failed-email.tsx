import { Button, Section, Text } from "@react-email/components";
import { EMAIL_CLASSES, EMAIL_COLORS, EMAIL_STYLES } from "./email-colors";
import { EmailCard } from "./_components/email-card";
import { EmailCTA } from "./_components/email-cta";
import { EmailHeading } from "./_components/email-heading";
import { EmailLayout } from "./_components/email-layout";
import { ErrorCodeBlock } from "./_components/error-code-block";
import { FlexRow } from "./_components/flex-row";

interface AdminWebhookFailedEmailProps {
	eventId: string;
	eventType: string;
	attempts: number;
	error: string;
	stripeDashboardUrl: string;
	adminDashboardUrl: string;
}

export const AdminWebhookFailedEmail = ({
	eventId,
	eventType,
	attempts,
	error,
	stripeDashboardUrl,
	adminDashboardUrl,
}: AdminWebhookFailedEmailProps) => {
	return (
		<EmailLayout
			preview={`Webhook ${eventType} en échec (${attempts} tentatives)`}
			headerText="Webhook Stripe en échec"
			footer={
				<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.tiny}>
					Cet email a été envoyé automatiquement par le système de monitoring Synclune.
				</Text>
			}
		>
			<Section style={{ marginBottom: "24px", textAlign: "center" }}>
				<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.small}>
					Action manuelle peut-être requise
				</Text>
			</Section>

			<EmailCard style={{ marginBottom: "24px" }}>
				<FlexRow
					style={{ marginBottom: "8px" }}
					left={
						<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.small}>
							Event ID
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
							{eventId}
						</Text>
					}
				/>
				<FlexRow
					style={{ marginBottom: "8px" }}
					left={
						<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.small}>
							Type d'événement
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
							{eventType}
						</Text>
					}
				/>
				<FlexRow
					left={
						<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.small}>
							Tentatives
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
							{attempts}
						</Text>
					}
				/>
			</EmailCard>

			<Section style={{ marginBottom: "24px" }}>
				<EmailHeading level="h3" style={{ marginBottom: "8px" }}>
					Dernière erreur
				</EmailHeading>
				<ErrorCodeBlock error={error} />
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
					Voir dans Stripe
				</Button>
			</Section>
			<EmailCTA href={adminDashboardUrl}>Dashboard Admin</EmailCTA>
		</EmailLayout>
	);
};

AdminWebhookFailedEmail.PreviewProps = {
	eventId: "evt_1234567890abcdefghij",
	eventType: "checkout.session.completed",
	attempts: 3,
	error: "Error: Order not found: clxxx12345",
	stripeDashboardUrl: "https://dashboard.stripe.com/webhooks",
	adminDashboardUrl: "https://synclune.fr/admin",
} as AdminWebhookFailedEmailProps;

export default AdminWebhookFailedEmail;
