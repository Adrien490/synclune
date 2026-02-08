import { Button, Section, Text } from "@react-email/components";
import { EMAIL_COLORS, EMAIL_STYLES } from "./email-colors";
import { EmailLayout } from "./_components/email-layout";
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
			preview={`ALERTE : Webhook ${eventType} en echec (${attempts} tentatives)`}
			headerText="Webhook Stripe en echec"
			footer={
				<Text style={EMAIL_STYLES.text.tiny}>
					Cet email a ete envoye automatiquement par le systeme de
					monitoring Synclune.
				</Text>
			}
		>
			<Section style={{ marginBottom: "24px", textAlign: "center" }}>
				<Text style={EMAIL_STYLES.text.small}>
					Action manuelle peut etre requise
				</Text>
			</Section>

			{/* Details */}
			<Section style={{ marginBottom: "24px" }}>
				<div style={EMAIL_STYLES.section.card}>
					<FlexRow
						style={{ marginBottom: "8px" }}
						left={<Text style={EMAIL_STYLES.text.small}>Event ID</Text>}
						right={
							<Text
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
							<Text style={EMAIL_STYLES.text.small}>
								Type d&apos;evenement
							</Text>
						}
						right={
							<Text
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
						left={<Text style={EMAIL_STYLES.text.small}>Tentatives</Text>}
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
				</div>
			</Section>

			{/* Error */}
			<Section style={{ marginBottom: "24px" }}>
				<Text style={{ ...EMAIL_STYLES.heading.h3, marginBottom: "8px" }}>
					Derniere erreur
				</Text>
				<div
					style={{
						...EMAIL_STYLES.section.card,
						backgroundColor: EMAIL_COLORS.text.primary,
						padding: "12px",
					}}
				>
					<code
						style={{
							fontFamily: "monospace",
							fontSize: "12px",
							color: EMAIL_COLORS.primary,
							wordBreak: "break-all",
						}}
					>
						{error}
					</code>
				</div>
			</Section>

			{/* CTAs */}
			<Section style={{ marginBottom: "32px", textAlign: "center" }}>
				<div style={{ marginBottom: "12px" }}>
					<Button
						href={stripeDashboardUrl}
						style={{
							...EMAIL_STYLES.button.primary,
							backgroundColor: "#635bff",
						}}
					>
						Voir dans Stripe
					</Button>
				</div>
				<div>
					<Button
						href={adminDashboardUrl}
						style={EMAIL_STYLES.button.primary}
					>
						Dashboard Admin
					</Button>
				</div>
			</Section>
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
