import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Set up larger limit for base64 image uploads
app.use(express.json({ limit: '15mb' }));

// Initialize Gemini SDK lazily to avoid immediate crash if key is not defined on startup
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required but not set.');
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// REST API endpoint to extract receipt data using Gemini API
app.post('/api/extract-receipt', async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Data gambar (imageBase64) tidak boleh kosong.' });
    }

    // Clean base64 header if present (e.g., "data:image/png;base64,")
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z+.-]+;base64,/, '');
    const cleanMimeType = mimeType || 'image/jpeg';

    const ai = getGeminiClient();

    const imagePart = {
      inlineData: {
        mimeType: cleanMimeType,
        data: cleanBase64,
      },
    };

    const textPart = {
      text: 'Analyze this receipt / invoice / purchase slip image. Extract the following information: vendor/shop name, total amount spent, date of transaction, short list of items purchased as description, and category. Return the fields as a high-precision structured JSON object matching the defined schema.',
    };

    console.log(`[Gemini Extraction] Sending request using gemini-3.5-flash for receipt analysis...`);
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            vendor: {
              type: Type.STRING,
              description: 'Nama toko, vendor, atau penerima dana dari kuitansi (contoh: PLN, Indomaret, Gaji Bapak Bambang).',
            },
            amount: {
              type: Type.INTEGER,
              description: 'Total nominal biaya akhir dalam Rupiah (IDR) dalam bentuk angka murni tanpa titik atau koma (contoh: 154500).',
            },
            category: {
              type: Type.STRING,
              description: 'Kategori pengeluaran yang paling sesuai. Harus salah satu dari: "Operasional", "Gaji", "Utilitas", "Transportasi", "Pajak", "Lainnya".',
            },
            description: {
              type: Type.STRING,
              description: 'Deskripsi singkat berisi item yang dibeli, rincian barang, atau penjelasan singkat kegunaan transaksi.',
            },
            date: {
              type: Type.STRING,
              description: 'Tanggal transaksi yang tertera pada nota dalam format standar YYYY-MM-DD.',
            },
          },
          required: ['vendor', 'amount'],
        },
      },
    });

    const responseText = response.text;
    console.log('[Gemini Extraction] Received response text:', responseText);

    if (!responseText) {
      throw new Error('Model Gemini tidak mengembalikan respon teks.');
    }

    const data = JSON.parse(responseText.trim());
    return res.json({ success: true, data });

  } catch (err: any) {
    console.error('Error during receipt extraction processing:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Gagal mengekstrak data dari kuitansi menggunakan Gemini API.',
    });
  }
});

// Secure server-side proxy route for sending invoice emails via Resend
app.post('/api/send-email', async (req, res) => {
  try {
    const { to, subject, html, companyName, invoiceNumber, cc, attachments } = req.body;
    if (!to || !subject || !html) {
      return res.status(400).json({ success: false, error: 'Parameter "to", "subject", dan "html" wajib diisi.' });
    }

    const apiKey = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;
    if (apiKey) {
      console.log(`[Email Service] Attempting to send real email to ${to} using Resend API Key...`);
      const payload: any = {
        from: `${companyName || 'FORSDIG'} <onboarding@resend.dev>`,
        to: Array.isArray(to) ? to : [to],
        subject: subject,
        html: html,
      };

      if (cc && cc.length > 0) {
        payload.cc = cc;
      }

      if (attachments && attachments.length > 0) {
        payload.attachments = attachments;
      }

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        console.log(`[Email Service] Resend API success sending email to ${to}`);
        return res.json({ success: true, sandbox: false });
      } else {
        const errData: any = await response.json().catch(() => ({}));
        console.error(`[Email Service] Resend API error:`, errData);
        return res.status(response.status).json({
          success: false,
          sandbox: false,
          error: errData.message || `HTTP ${response.status} dari Resend API`,
        });
      }
    } else {
      console.log(`[Email Service] No Resend API Key found. Simulating Sandbox local response for ${to}...`);
      // Simulate slight network latency
      await new Promise(resolve => setTimeout(resolve, 400));
      return res.json({ success: true, sandbox: true });
    }
  } catch (error: any) {
    console.error('[Email Service] Error dispatching email:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Kegagalan layanan internal server saat mengirim email.',
    });
  }
});

// Configure Vite as middleware in development or serve built production files
async function setupVite() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('[Vite] Running Vite in development middleware mode.');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('[Vite] Serving static files in production mode.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Aplikasi berjalan aktif di port ${PORT}`);
  });
}

setupVite();
