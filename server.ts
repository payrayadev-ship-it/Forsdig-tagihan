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
