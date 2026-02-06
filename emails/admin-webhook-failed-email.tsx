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
		<Html>
			<Head />
			<Preview>
				{`ALERTE : Webhook ${eventType} en echec (${attempts} tentatives)`}
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
							Webhook Stripe en echec
						</Text>
						<Text style={{ ...EMAIL_STYLES.text.small, marginTop: "8px" }}>
							Action manuelle peut etre requise
						</Text>
					</Section>

					{/* Details */}
					<Section style={{ marginBottom: "24px" }}>
						<div style={EMAIL_STYLES.section.card}>
							<div
								style={{
									display: "flex",
									justifyContent: "space-between",
									marginBottom: "8px",
								}}
							>
								<Text style={EMAIL_STYLES.text.small}>Event ID</Text>
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
							</div>
							<div
								style={{
									display: "flex",
									justifyContent: "space-between",
									marginBottom: "8px",
								}}
							>
								<Text style={EMAIL_STYLES.text.small}>
									Type d&apos;evenement
								</Text>
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
							</div>
							<div
								style={{
									display: "flex",
									justifyContent: "space-between",
								}}
							>
								<Text style={EMAIL_STYLES.text.small}>Tentatives</Text>
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
							</div>
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

					{/* Footer */}
					<Section
						style={{
							paddingTop: "24px",
							borderTop: `1px solid ${EMAIL_COLORS.border}`,
							textAlign: "center",
						}}
					>
						<Text style={EMAIL_STYLES.text.tiny}>
							Cet email a ete envoye automatiquement par le systeme de
							monitoring Synclune.
						</Text>
						<Text style={EMAIL_STYLES.text.tiny}>
							© {new Date().getFullYear()} Synclune
						</Text>
					</Section>
				</Container>
			</Body>
		</Html>
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
