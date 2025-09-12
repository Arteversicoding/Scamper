import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "https://esm.run/@google/generative-ai";
import { geminiApiKey } from "./config.js";

const genAI = new GoogleGenerativeAI(geminiApiKey);

// Konfigurasi model
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
});

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

/**
 * Fungsi utama untuk berinteraksi dengan AI.
 * @param {string} prompt - Teks input terbaru dari pengguna.
 * @param {Array} history - Riwayat percakapan sebelumnya.
 * @returns {Promise<string>} - Respons teks dari AI.
 */
export async function getChatResponse(prompt, history = []) {
  try {
    const chat = await model.startChat({
      history: history,
      generationConfig,
      safetySettings,
    });

    const result = await chat.sendMessage(prompt);
    const response = result.response;
    return response.text();

  } catch (error) {
    console.error("Error getting chat response:", error);
    if (error.message.includes('429')) {
        return "Terlalu banyak permintaan dalam waktu singkat. Mohon tunggu sejenak dan coba lagi.";
    }
    if (error.message.includes('API key not valid')) {
        return "Error: API Key tidak valid. Mohon periksa kembali di file config.js.";
    }
    return "Maaf, terjadi kesalahan saat menghubungi AI. Coba lagi nanti.";
  }
}

/**
 * Menghasilkan respons dari AI dengan konteks tambahan dari file/materi.
 * @param {string} context - Teks dari materi yang diunggah.
 * @param {string} question - Pertanyaan pengguna terkait materi.
 * @param {Array} history - Riwayat percakapan sebelumnya.
 * @returns {Promise<string>} - Respons teks dari AI.
 */
export async function getResponseWithContext(context, question, history = []) {
  const fullPrompt = `
    Berdasarkan materi berikut:
    --- MATERI ---
    ${context}
    --- END MATERI ---

    Jawab pertanyaan ini: ${question}
  `;
  return await getChatResponse(fullPrompt, history);
}