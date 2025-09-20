import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "https://esm.run/@google/generative-ai";
import { geminiApiKey, geminiApiKeys } from "/config.js";

// Kumpulan API key: gunakan array jika tersedia, jika tidak fallback ke single key
const ALL_KEYS = (Array.isArray(geminiApiKeys) && geminiApiKeys.length > 0)
  ? geminiApiKeys
  : [geminiApiKey];

let currentKeyIndex = 0; // dirotasi saat overload/rate limit

function buildModelForKey(key) {
  const instance = new GoogleGenerativeAI(key);
  return instance.getGenerativeModel({ model: "gemini-1.5-flash" });
}

const generationConfig = {
  temperature: 1,
  topK: 64,
  topP: 0.95,
  maxOutputTokens: 8192,
};

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

function isRetryableError(err) {
  const msg = (err && (err.message || String(err))) || "";
  const low = msg.toLowerCase();
  return msg.includes("503") || low.includes("overloaded") || low.includes("temporarily unavailable") || msg.includes("429") || low.includes("rate limit");
}

function isInvalidKey(err) {
  const msg = (err && (err.message || String(err))) || "";
  return msg.toLowerCase().includes("api key not valid") || msg.toLowerCase().includes("invalid api key");
}

async function delay(ms) {
  return new Promise(res => setTimeout(res, ms));
}

async function sendWithRetry(chat, prompt, retries = 3, baseDelay = 700) {
  let attempt = 0;
  while (true) {
    try {
      const result = await chat.sendMessage(prompt);
      return result;
    } catch (err) {
      if (attempt >= retries || !isRetryableError(err)) throw err;
      const backoff = baseDelay * Math.pow(2, attempt) + Math.floor(Math.random() * 200);
      console.warn(`Gemini transient error, retrying in ${backoff}ms...`, err);
      await delay(backoff);
      attempt++;
    }
  }
}

/**
 * Fungsi utama untuk berinteraksi dengan AI.
 * @param {string} prompt - Teks input terbaru dari pengguna.
 * @returns {Promise<string>} - Respons teks dari AI.
 */
export async function getChatResponse(prompt) {
  let lastErr = null;
  for (let i = 0; i < ALL_KEYS.length; i++) {
    const idx = (currentKeyIndex + i) % ALL_KEYS.length;
    const key = ALL_KEYS[idx];
    try {
      const model = buildModelForKey(key);
      const chat = await model.startChat({ generationConfig, safetySettings });
      const result = await sendWithRetry(chat, prompt, 3, 700);
      // simpan index key yang berhasil untuk pemakaian berikutnya
      currentKeyIndex = idx;
      const response = result.response;
      return response.text();
    } catch (error) {
      lastErr = error;
      const msg = error?.message || "";
      console.warn(`Key index ${idx} failed:`, msg);
      // Jika key invalid, langsung lanjut ke key berikutnya tanpa retry lebih lanjut
      if (isInvalidKey(error)) continue;
      // Jika retryable namun sudah di-retry di sendWithRetry dan tetap gagal, coba key berikutnya
      if (isRetryableError(error)) continue;
      // Non-retryable dan bukan invalid key -> hentikan
      break;
    }
  }
  console.error("Error getting chat response (all keys tried):", lastErr);
  const msg = lastErr?.message || "";
  if (msg.includes('429')) {
    return "Terlalu banyak permintaan dalam waktu singkat. Mohon tunggu sejenak dan coba lagi.";
  }
  if (msg.includes('503') || msg.toLowerCase().includes('overloaded')) {
    return "Model sedang sibuk (503). Silakan coba lagi sebentar lagi.";
  }
  if (msg.toLowerCase().includes('api key not valid')) {
    return "Error: API Key tidak valid. Mohon periksa kembali di file config.js.";
  }
  return "Maaf, terjadi kesalahan saat menghubungi AI. Coba lagi nanti.";
}

/**
 * Menghasilkan respons dari AI dengan konteks tambahan dari file/materi.
 * @param {string} context - Teks dari materi yang diunggah.
 * @param {string} question - Pertanyaan pengguna terkait materi.
 * @returns {Promise<string>} - Respons teks dari AI.
 */
export async function getResponseWithContext(context, question) {
  const fullPrompt = `
    Berdasarkan materi berikut:
    --- MATERI ---
    ${context}
    --- END MATERI ---

    Jawab pertanyaan ini: ${question}
  `;
  return await getChatResponse(fullPrompt);
}