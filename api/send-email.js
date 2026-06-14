import { Resend } from 'resend';

export default async function handler(req, res) {
  // Required logging
  console.log('Email Request:', req.body);

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Hanya menerima method POST'
    });
  }

  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error('[Email Service] Error: RESEND_API_KEY environment variable is not defined.');
      return res.status(400).json({
        success: false,
        error: 'Email Service belum dikonfigurasi di Vercel'
      });
    }

    const { to, subject, html, companyName, x, cc, attachments } = req.body;

    // Validate body request
    if (!to || !subject || !html) {
      return res.status(400).json({
        success: false,
        error: 'Parameter "to", "subject", dan "html" wajib diisi.'
      });
    }

    // Initialize Resend with the RESEND_API_KEY
    const cleanedApiKey = apiKey.trim().replace(/^["']|["']$/g, '');
    const resend = new Resend(cleanedApiKey);

    // Sanitize and quote the company name to avoid RFC 5322 issues with special characters
    const cleanCompany = (companyName || 'FORSDIG')
      .replace(/["\\]/g, '')
      .trim();

    // Prepare payload
    const payload = {
      from: `"${cleanCompany}" <onboarding@resend.dev>`,
      to: Array.isArray(to) ? to : [to],
      subject: subject,
      html: html,
    };

    if (cc && (Array.isArray(cc) ? cc.length > 0 : cc)) {
      payload.cc = Array.isArray(cc) ? cc : [cc];
    }

    if (attachments && attachments.length > 0) {
      payload.attachments = attachments.map(item => {
        // Safe conversion of base64 content to binary Buffer for Node.js
        const contentBuffer = typeof item.content === 'string'
          ? Buffer.from(item.content, 'base64')
          : item.content;

        return {
          filename: item.filename,
          content: contentBuffer
        };
      });
    }

    console.log(`[Email Service] dispatching email via Resend SDK to: ${to}`);
    const response = await resend.emails.send(payload);

    if (response.error) {
      console.error('[Email Service] Resend API execution error:', response.error);
      
      let errorMsg = response.error.message || 'Gagal mengirim email';
      
      // Improve user troubleshooting for sandbox limitations
      if (
        errorMsg.toLowerCase().includes('onboarding@resend.dev') ||
        errorMsg.toLowerCase().includes('restricted') ||
        errorMsg.toLowerCase().includes('verified')
      ) {
        errorMsg += ' (Hubungi developer: Onboarding Resend API dibatasi hanya dapat mengirim email ke inbox terdaftar Anda. Konfigurasi alamat email penerima agar cocok dengan email login Resend Anda, atau daftarkan domain kustom di dashboard Resend.)';
      }

      return res.status(400).json({
        success: false,
        error: errorMsg
      });
    }

    console.log('[Email Service] Email dispatched successfully:', response.data);
    return res.status(200).json({
      success: true,
      id: response.data?.id
    });

  } catch (error) {
    console.error('[Email Service] Serverless Function Exception:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
