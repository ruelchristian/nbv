import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from './firebase';
import { Appointment } from '../types';

export const GMAIL_SCOPES = ['https://www.googleapis.com/auth/gmail.send'];

// In-memory token cache strictly adhering to security guidelines (NO localStorage)
let cachedGmailAccessToken: string | null = null;

export const getGmailAccessToken = (): string | null => cachedGmailAccessToken;

export const setGmailAccessToken = (token: string | null): void => {
  cachedGmailAccessToken = token;
};

/**
 * Requests or refreshes OAuth access token with the gmail.send scope.
 */
export const requestGmailAccess = async (): Promise<string> => {
  const provider = new GoogleAuthProvider();
  GMAIL_SCOPES.forEach((scope) => provider.addScope(scope));
  // Request incremental consent for Gmail sending
  provider.setCustomParameters({
    prompt: 'consent',
    access_type: 'online',
  });

  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Gmail authorization token from Google.');
    }

    cachedGmailAccessToken = credential.accessToken;
    return cachedGmailAccessToken;
  } catch (err: unknown) {
    const errorObj = err as { code?: string; message?: string };
    if (errorObj?.code === 'auth/popup-blocked') {
      throw new Error(
        'Browser popup was blocked. You can allow popups in your browser address bar or use the "Open in Gmail" button below to send immediately.'
      );
    }
    if (errorObj?.code === 'auth/cancelled-popup-request' || errorObj?.code === 'auth/popup-closed-by-user') {
      throw new Error(
        'Google authorization window was closed. Use "Open in Gmail" to send the confirmation email directly.'
      );
    }
    throw err;
  }
};

/**
 * Base64URL encoder conforming to RFC 4648 §5 (URL- and filename-safe standard)
 */
function base64UrlEncode(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Build RFC 2822 MIME email message
 */
export function buildConfirmationEmailMime(
  appointment: Appointment,
  recipientEmail: string,
  ownerEmail: string = 'rayanat.barbosa@gmail.com'
): { subject: string; raw: string; htmlBody: string } {
  const cleanRecipient = recipientEmail.trim();
  const subject = `✨ Appointment Confirmed: Nails by Vril – ${appointment.serviceName} on ${appointment.appointmentDate}`;

  const meetingLocationName = appointment.meetingLocationName || 'Nails by Vril Studio';
  const googleMapsUrl = appointment.meetingLocationGoogleMapsUrl || 'https://maps.app.goo.gl/P39FX7dVpXAs32MCA';
  const stylesDisplay = appointment.selectedNailStyles && appointment.selectedNailStyles.length > 0
    ? appointment.selectedNailStyles.join(', ')
    : 'Custom Nail Artistry';
  const clientCountDisplay = appointment.clientCount && appointment.clientCount > 1
    ? `${appointment.clientCount} clients`
    : '1 client';

  const htmlBody = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FAF7F4; margin: 0; padding: 24px; color: #231F20; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #F3B8C3; box-shadow: 0 4px 12px rgba(139, 58, 86, 0.08); }
    .header { background: linear-gradient(135deg, #8B3A56 0%, #722A42 100%); color: #ffffff; padding: 32px 24px; text-align: center; }
    .header h1 { margin: 0 0 6px 0; font-size: 26px; font-weight: 700; letter-spacing: 0.5px; }
    .header p { margin: 0; font-size: 13px; color: #FCEBEE; letter-spacing: 1px; text-transform: uppercase; font-weight: 500; }
    .badge { display: inline-block; background-color: #D1FAE5; color: #047857; font-size: 12px; font-weight: 700; padding: 6px 14px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px; margin: 20px 0 10px; }
    .content { padding: 24px; }
    .greeting { font-size: 16px; font-weight: 600; color: #231F20; margin-bottom: 8px; }
    .intro { font-size: 14px; line-height: 1.6; color: #5C5257; margin-bottom: 20px; }
    .card { background-color: #FFF9F6; border: 1px solid #F3B8C3; border-radius: 16px; padding: 20px; margin-bottom: 24px; }
    .card-title { font-size: 14px; font-weight: 700; color: #8B3A56; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; border-bottom: 1px dashed #F3B8C3; padding-bottom: 8px; }
    .perks-box { background: #FAF7F4; border-radius: 14px; padding: 16px; margin-bottom: 24px; border: 1px solid #EFE8E9; }
    .perk-item { display: flex; align-items: flex-start; margin-bottom: 8px; font-size: 13px; color: #5C5257; }
    .perk-icon { margin-right: 8px; font-size: 15px; }
    .cta-btn { display: inline-block; background-color: #8B3A56; color: #ffffff !important; text-decoration: none; font-size: 13px; font-weight: 600; padding: 12px 28px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px; }
    .map-btn { display: inline-block; background-color: #047857; color: #ffffff !important; text-decoration: none; font-size: 12px; font-weight: 600; padding: 10px 22px; border-radius: 9999px; margin-top: 8px; }
    .footer { text-align: center; padding: 20px; font-size: 11px; color: #7A6E74; border-top: 1px solid #EFE8E9; background: #FAF7F4; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <p>Official Confirmation</p>
      <h1>Nails by Vril</h1>
      <p style="font-size: 11px; opacity: 0.9; margin-top: 4px;">Handcrafted Nail Artistry & Extensions · Pasig, Metro Manila</p>
    </div>

    <div class="content">
      <div style="text-align: center;">
        <span class="badge">Appointment Confirmed by Owner ✓</span>
      </div>

      <p class="greeting">Hi ${appointment.customerName},</p>
      <p class="intro">
        Great news! Your appointment request has been officially reviewed and <strong>confirmed</strong> by Vril. We look forward to creating your dream nail set!
      </p>

      <div class="card">
        <div class="card-title">Appointment Summary</div>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="padding: 6px 0; color: #7A6E74; font-weight: 500;">Service:</td>
            <td style="padding: 6px 0; color: #231F20; font-weight: 700; text-align: right;">${appointment.serviceName}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #7A6E74; font-weight: 500;">Selected Styles:</td>
            <td style="padding: 6px 0; color: #8B3A56; font-weight: 600; text-align: right;">${stylesDisplay}</td>
          </tr>
          ${appointment.isHomeService ? `
          <tr>
            <td style="padding: 6px 0; color: #7A6E74; font-weight: 500;">Client Count:</td>
            <td style="padding: 6px 0; color: #231F20; font-weight: 700; text-align: right;">${clientCountDisplay}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 6px 0; color: #7A6E74; font-weight: 500;">Date:</td>
            <td style="padding: 6px 0; color: #231F20; font-weight: 700; text-align: right;">${appointment.appointmentDate}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #7A6E74; font-weight: 500;">Time Slot:</td>
            <td style="padding: 6px 0; color: #8B3A56; font-weight: 700; text-align: right;">${appointment.startTime}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #7A6E74; font-weight: 500;">Total Fee:</td>
            <td style="padding: 6px 0; color: #8B3A56; font-size: 15px; font-weight: 700; text-align: right;">₱${appointment.servicePrice.toLocaleString()}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #7A6E74; font-weight: 500;">Meeting Location:</td>
            <td style="padding: 6px 0; color: #231F20; font-weight: 600; text-align: right;">
              ${appointment.isHomeService
                ? `On-Site Home Service: ${appointment.homeServiceAddress || 'Client Residence'}`
                : `${meetingLocationName} · Pasig, Metro Manila`}
            </td>
          </tr>
        </table>

        ${!appointment.isHomeService ? `
        <div style="margin-top: 14px; text-align: center; border-top: 1px dashed #F3B8C3; padding-top: 12px;">
          <p style="margin: 0 0 6px 0; font-size: 12px; color: #5C5257;"><strong>Google Maps Directions & Location Reference:</strong></p>
          <a href="${googleMapsUrl}" class="map-btn" target="_blank">Open in Google Maps 📍</a>
          <p style="margin: 6px 0 0 0; font-size: 11px; color: #7A6E74;">Reference: ${googleMapsUrl}</p>
        </div>
        ` : ''}
      </div>

      <div class="perks-box">
        <strong style="display: block; margin-bottom: 8px; color: #231F20; font-size: 13px;">Your Complimentary Perks:</strong>
        <div class="perk-item"><span class="perk-icon">🍹</span><span><strong>Free Iced Drink:</strong> Served during your studio session</span></div>
        <div class="perk-item"><span class="perk-icon">🎴</span><span><strong>Loyalty Rewards Card:</strong> Stamped on your first visit (5th visit: 20% OFF, 10th visit: FREE set)</span></div>
        <div class="perk-item"><span class="perk-icon">💅</span><span><strong>1-Week Free Repair:</strong> Free touch-ups if any lifting occurs within 7 days</span></div>
      </div>

      <div style="background-color: #FCEBEE; border-left: 4px solid #8B3A56; padding: 12px 16px; border-radius: 8px; margin-bottom: 24px; font-size: 12px; color: #5C5257;">
        <strong>Friendly Reminders:</strong>
        ${appointment.isHomeService 
          ? 'Home service requires 1-4 clients (₱250/person fee + Move It fare). Please prepare a clean, stable table workspace.' 
          : 'Please arrive on time. Cash and GCash payments are warmly accepted at the studio.'}
      </div>

      <div style="text-align: center; margin: 28px 0 16px;">
        <a href="https://instagram.com/nailsby.vril" class="cta-btn" target="_blank">Instagram: @nailsby.vril</a>
      </div>
    </div>

    <div class="footer">
      <p style="margin: 0 0 4px 0;"><strong>Nails by Vril Official Appointment Notification</strong></p>
      <p style="margin: 0;">Sent directly to <strong>${cleanRecipient}</strong> · Owner Contact: ${ownerEmail}</p>
    </div>
  </div>
</body>
</html>`;

  // Encode header subject safely if UTF-8
  const encodedSubject = `=?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;

  const lines = [
    `From: Nails by Vril <${ownerEmail}>`,
    `To: <${cleanRecipient}>`,
    `Cc: <${ownerEmail}>`,
    `Reply-To: <${ownerEmail}>`,
    `Subject: ${encodedSubject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    htmlBody,
  ];

  const raw = base64UrlEncode(lines.join('\r\n'));

  return { subject, raw, htmlBody };
}

/**
 * Send the appointment confirmation email via the official Gmail REST API.
 */
export async function sendAppointmentConfirmationEmail(
  appointment: Appointment,
  options?: {
    customRecipient?: string;
    ownerEmail?: string;
    onTokenRequested?: () => void;
  }
): Promise<{ success: boolean; messageId: string; recipient: string }> {
  const recipient = options?.customRecipient || appointment.customerEmail || 'rayanat.barbosa@gmail.com';
  const ownerEmail = options?.ownerEmail || 'rayanat.barbosa@gmail.com';

  let token = cachedGmailAccessToken;
  if (!token) {
    if (options?.onTokenRequested) options.onTokenRequested();
    token = await requestGmailAccess();
  }

  const { raw } = buildConfirmationEmailMime(appointment, recipient, ownerEmail);

  let response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  });

  // If token expired, clear and request fresh token once
  if (response.status === 401) {
    cachedGmailAccessToken = null;
    token = await requestGmailAccess();
    response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw }),
    });
  }

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(
      errorJson?.error?.message || `Gmail API error (${response.status}): Failed to send message.`
    );
  }

  const data = await response.json();
  return {
    success: true,
    messageId: data.id,
    recipient,
  };
}

/**
 * Generates an instant, zero-friction pre-filled Gmail compose web link.
 * Used as a 100% reliable direct fallback button in the UI.
 */
export function generateGmailComposeUrl(
  appointment: Appointment,
  recipientEmail?: string
): string {
  const recipient = recipientEmail || appointment.customerEmail || 'rayanat.barbosa@gmail.com';
  const subject = `✨ Appointment Confirmed: Nails by Vril – ${appointment.serviceName} on ${appointment.appointmentDate}`;
  const googleMapsUrl = appointment.meetingLocationGoogleMapsUrl || 'https://maps.app.goo.gl/P39FX7dVpXAs32MCA';
  
  const body = `Hi ${appointment.customerName},

Your appointment with Nails by Vril has been confirmed!

--- APPOINTMENT DETAILS ---
Service: ${appointment.serviceName}
${appointment.selectedNailStyles && appointment.selectedNailStyles.length > 0 ? `Selected Styles: ${appointment.selectedNailStyles.join(', ')}\n` : ''}${appointment.clientCount && appointment.clientCount > 1 ? `Client Count: ${appointment.clientCount} people\n` : ''}Date: ${appointment.appointmentDate}
Time: ${appointment.startTime}
Total Fee: ₱${appointment.servicePrice.toLocaleString()}
Location: ${appointment.isHomeService ? `Home Service: ${appointment.homeServiceAddress || 'Client Location'}` : 'Nails by Vril Pasig Studio (Pasig, Metro Manila)'}
${!appointment.isHomeService ? `Google Maps Directions: ${googleMapsUrl}\n` : ''}
--- COMPLIMENTARY PERKS ---
✓ Free iced beverage with every studio session
✓ Loyalty Card stamped for your visit (5th visit: 20% OFF, 10th visit: FREE set)
✓ 1-Week Free Repair Guarantee: free touch-ups for lifting within 7 days

Instagram: @nailsby.vril
Feel free to reply if you need any adjustments. See you soon!

With love,
Vril · Nails by Vril`;

  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
    recipient
  )}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/**
 * Build RFC 2822 MIME email message for rejected / declined appointment requests
 */
export function buildRejectionEmailMime(
  appointment: Appointment,
  recipientEmail: string,
  reason: string = 'Requested time slot is fully booked',
  ownerEmail: string = 'rayanat.barbosa@gmail.com'
): { subject: string; raw: string; htmlBody: string } {
  const cleanRecipient = recipientEmail.trim();
  const subject = `Update on your Nails by Vril appointment request (${appointment.appointmentDate})`;

  const htmlBody = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FAF7F4; margin: 0; padding: 24px; color: #231F20; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #F3B8C3; box-shadow: 0 4px 12px rgba(139, 58, 86, 0.08); }
    .header { background: linear-gradient(135deg, #8B3A56 0%, #722A42 100%); color: #ffffff; padding: 32px 24px; text-align: center; }
    .header h1 { margin: 0 0 6px 0; font-size: 26px; font-weight: 700; }
    .badge { display: inline-block; background-color: #FEE2E2; color: #B91C1C; font-size: 12px; font-weight: 700; padding: 6px 14px; border-radius: 9999px; text-transform: uppercase; margin: 20px 0 10px; }
    .content { padding: 24px; }
    .greeting { font-size: 16px; font-weight: 600; color: #231F20; margin-bottom: 8px; }
    .intro { font-size: 14px; line-height: 1.6; color: #5C5257; margin-bottom: 20px; }
    .card { background-color: #FAF7F4; border: 1px solid #EFE8E9; border-radius: 16px; padding: 20px; margin-bottom: 24px; }
    .reason-box { background-color: #FEF3C7; border-left: 4px solid #D97706; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; font-size: 13px; color: #92400E; }
    .cta-btn { display: inline-block; background-color: #8B3A56; color: #ffffff !important; text-decoration: none; font-size: 13px; font-weight: 600; padding: 12px 28px; border-radius: 9999px; text-transform: uppercase; }
    .footer { text-align: center; padding: 20px; font-size: 11px; color: #7A6E74; border-top: 1px solid #EFE8E9; background: #FAF7F4; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Nails by Vril</h1>
      <p style="margin: 0; font-size: 12px; color: #FCEBEE;">Appointment Request Status</p>
    </div>

    <div class="content">
      <div style="text-align: center;">
        <span class="badge">Slot Unavailable · Request Not Confirmed</span>
      </div>

      <p class="greeting">Hi ${appointment.customerName},</p>
      <p class="intro">
        Thank you for choosing Nails by Vril. We reviewed your booking request for <strong>${appointment.serviceName}</strong> on <strong>${appointment.appointmentDate} at ${appointment.startTime}</strong>, but unfortunately we are unable to accommodate this slot.
      </p>

      <div class="reason-box">
        <strong>Reason from Artist:</strong> ${reason}
      </div>

      <div class="card">
        <strong style="display: block; margin-bottom: 8px; color: #231F20; font-size: 13px;">📅 Scheduling Guidelines:</strong>
        <p style="font-size: 13px; color: #5C5257; margin: 0 0 8px 0; line-height: 1.5;">
          Our online booking portal is open <strong>24/7</strong> so you can browse designs and submit new requests anytime. Service appointments are scheduled exclusively on <strong>Sundays and Mondays</strong>.
        </p>
        <p style="font-size: 13px; color: #5C5257; margin: 0; line-height: 1.5;">
          Please feel free to submit a new request for another Sunday or Monday, or reach out to us on Instagram <strong>@nailsby.vril</strong>.
        </p>
      </div>

      <div style="text-align: center; margin: 28px 0 16px;">
        <a href="https://instagram.com/nailsby.vril" class="cta-btn" target="_blank">Contact on Instagram @nailsby.vril</a>
      </div>
    </div>

    <div class="footer">
      <p style="margin: 0 0 4px 0;"><strong>Nails by Vril Client Care</strong></p>
      <p style="margin: 0;">Sent to <strong>${cleanRecipient}</strong> · Studio Contact: ${ownerEmail}</p>
    </div>
  </div>
</body>
</html>`;

  const encodedSubject = `=?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;

  const lines = [
    `From: Nails by Vril <${ownerEmail}>`,
    `To: <${cleanRecipient}>`,
    `Cc: <${ownerEmail}>`,
    `Reply-To: <${ownerEmail}>`,
    `Subject: ${encodedSubject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    htmlBody,
  ];

  const raw = base64UrlEncode(lines.join('\r\n'));

  return { subject, raw, htmlBody };
}

/**
 * Send the appointment rejection/cancellation email via Gmail REST API
 */
export async function sendAppointmentRejectionEmail(
  appointment: Appointment,
  options?: {
    customRecipient?: string;
    ownerEmail?: string;
    reason?: string;
    onTokenRequested?: () => void;
  }
): Promise<{ success: boolean; messageId: string; recipient: string }> {
  const recipient = options?.customRecipient || appointment.customerEmail || 'rayanat.barbosa@gmail.com';
  const ownerEmail = options?.ownerEmail || 'rayanat.barbosa@gmail.com';
  const reason = options?.reason || 'Time slot is currently unavailable';

  let token = cachedGmailAccessToken;
  if (!token) {
    if (options?.onTokenRequested) options.onTokenRequested();
    token = await requestGmailAccess();
  }

  const { raw } = buildRejectionEmailMime(appointment, recipient, reason, ownerEmail);

  let response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  });

  if (response.status === 401) {
    cachedGmailAccessToken = null;
    token = await requestGmailAccess();
    response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw }),
    });
  }

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(
      errorJson?.error?.message || `Gmail API error (${response.status}): Failed to send rejection notice.`
    );
  }

  const data = await response.json();
  return {
    success: true,
    messageId: data.id,
    recipient,
  };
}

/**
 * Pre-filled rejection compose link for instant fallback
 */
export function generateGmailRejectionComposeUrl(
  appointment: Appointment,
  recipientEmail?: string,
  reason?: string
): string {
  const recipient = recipientEmail || appointment.customerEmail || 'rayanat.barbosa@gmail.com';
  const subject = `Update on your Nails by Vril appointment request (${appointment.appointmentDate})`;
  const actualReason = reason || 'The requested time slot is unavailable';

  const body = `Hi ${appointment.customerName},

Thank you for your interest in Nails by Vril!

Regarding your appointment request for ${appointment.serviceName} on ${appointment.appointmentDate} at ${appointment.startTime}:
Unfortunately, we are unable to accept this booking request at this time.
Reason: ${actualReason}

Our online booking portal is open 24/7, and sessions are scheduled exclusively on Sundays and Mondays. Feel free to submit another request for an upcoming Sunday or Monday, or message us on Instagram @nailsby.vril.

Warm regards,
Vril · Nails by Vril`;

  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
    recipient
  )}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
