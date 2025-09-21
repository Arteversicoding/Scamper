import { getChatResponse, getResponseWithContext } from '../services/gemini-service.js';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authService } from '../services/auth-service.js';


// Inisialisasi Supabase
const SUPABASE_URL = "https://zlcislycukayjgjhozjy.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsY2lzbHljdWtheWpnamhvemp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzOTcyNTcsImV4cCI6MjA3MTk3MzI1N30.XF_hxADjk1azFH3PfqK1i_edNlFLwPeZuzXvPmAx4XM";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

// State untuk menyimpan konteks dari file dan histori chat
let fileContext = null;
let currentUser = null;
let isHydrating = false; // to prevent re-persisting messages during hydration

// ===== Session Storage Helpers for per-tab chat persistence =====
function getStorageKey() {
    const uid = currentUser?.uid || 'guest';
    const path = window.location.pathname; // e.g., /pages/chat/chat.html
    return `chatState:${uid}:${path}`;
}

function loadChatState() {
    try {
        const raw = sessionStorage.getItem(getStorageKey());
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        console.warn('Failed to parse chat state:', e);
        return null;
    }
}

function saveChatState(state) {
    try {
        state.lastUpdated = Date.now();
        sessionStorage.setItem(getStorageKey(), JSON.stringify(state));
    } catch (e) {
        console.warn('Failed to save chat state:', e);
    }
}

function ensureState() {
    const s = loadChatState();
    if (s && Array.isArray(s.messages)) return s;
    return { messages: [], lastUpdated: Date.now(), atBottom: true, lastScroll: 0 };
}

function pushMessageToState(entry) {
    const state = ensureState();
    state.messages.push(entry);
    // Cap to avoid hitting sessionStorage limits
    if (state.messages.length > 100) {
        state.messages = state.messages.slice(-100);
    }
    const chat = document.getElementById('chat-messages');
    if (chat) state.atBottom = Math.abs(chat.scrollHeight - chat.scrollTop - chat.clientHeight) < 4;
    saveChatState(state);
}

function updateMessageInState(id, newText) {
    const state = ensureState();
    const msg = state.messages.find(m => m.id === id);
    if (msg) {
        msg.text = newText;
        msg.isLoading = false;
        saveChatState(state);
    }
}

function hydrateFromStorage() {
    const state = loadChatState();
    if (!state || !Array.isArray(state.messages) || state.messages.length === 0) return;

    const chatContainer = document.getElementById('chat-messages');
    if (!chatContainer) return;

    // Sanitize: remove consecutive duplicates caused by earlier persistence bug
    const deduped = [];
    for (const m of state.messages) {
        const last = deduped[deduped.length - 1];
        if (last && last.sender === m.sender && last.text === m.text) {
            // skip exact consecutive duplicate
            continue;
        }
        deduped.push(m);
    }
    if (deduped.length !== state.messages.length) {
        state.messages = deduped;
        saveChatState(state);
    }

    // Replace initial static welcome with stored messages
    chatContainer.innerHTML = '';

    // Render without re-persisting
    isHydrating = true;
    for (const m of state.messages) {
        // Render stored messages without loading indicator
        addMessageToChat(m.text, m.sender, false, m.timestamp ? { seconds: Math.floor(m.timestamp / 1000) } : null);
    }
    isHydrating = false;

    // Restore scroll
    setTimeout(() => {
        if (state.atBottom) {
            forceScrollToBottom();
        } else if (typeof state.lastScroll === 'number') {
            chatContainer.scrollTop = state.lastScroll;
        }
    }, 50);
}

function clearChatState() {
    try { sessionStorage.removeItem(getStorageKey()); } catch {}
    const chatContainer = document.getElementById('chat-messages');
    if (chatContainer) chatContainer.innerHTML = '';
}

// ===== Quick Prompts (One-click buttons to send predefined prompts) =====
const QUICK_PROMPTS = [
    {
        label: 'SCAMPER Bab 1: Lingkungan Buatan',
        text: `Prompt Bab : 1\n\nBuatkan alur pembelajaran berbasis SCAMPER untuk BAB 1: LINGKUNGAN BUATAN FASE A. \nTujuan Pembelajaran: Siswa mampu mengidentifikasi kondisi lingkungan di rumah dan sekolah serta mengajukan pertanyaan tentang permasalahan sederhana yang terkait dengan kehidupan sehari-hari. \nCocokkan dengan Capaian Pembelajaran "Lingkungan Kita" yang ada pada dokumen Panduan Proyek IPAS SD.`
    },
    {
        label: 'SCAMPER Bab 2: Diorama Siklus Air',
        text: `Prompt Bab : 2\n\nBuatkan alur pembelajaran berbasis SCAMPER untuk BAB 2: DIORAMA SIKLUS AIR (FASE B). \nTujuan Pembelajaran: Siswa mampu menjelaskan siklus air dan kaitannya dengan menjaga ketersediaan air bersih. \nCocokkan dengan Capaian Pembelajaran "Perubahan wujud zat, Siklus Air, dan Interaksi Sosial" pada dokumen Panduan Proyek IPAS SD.`
    },
    {
        label: 'SCAMPER Bab 3: Peta Keanekaragaman',
        text: `Prompt Bab : 3\n\nBuatkan alur pembelajaran berbasis SCAMPER untuk BAB 3: PETA KEANEKARAGAMAN (FASE B). \nTujuan Pembelajaran: Siswa mampu mengidentifikasi keanekaragaman makhluk hidup di lingkungan sekitar. \nCocokkan dengan Capaian Pembelajaran Bab 3 yang ada pada dokumen Panduan Proyek IPAS SD.`
    },
    {
        label: 'SCAMPER Bab 4: Sistem Tata Surya',
        text: `Prompt Bab : 4\n\nBuatkan alur pembelajaran berbasis SCAMPER untuk BAB 4: SISTEM TATA SURYA (FASE C). \nTujuan Pembelajaran: Siswa mampu menjelaskan benda-benda langit, termasuk planet dan satelit, serta memahami perubahan lingkungan di bumi. \nCocokkan dengan Capaian Pembelajaran Bab 4 pada dokumen Panduan Proyek IPAS SD.`
    },
    {
        label: 'SCAMPER Bab 5: Ekonomi Kreatif',
        text: `Prompt Bab : 5\n\nBuatkan alur pembelajaran berbasis SCAMPER untuk BAB 5: EKONOMI KREATIF (FASE C). \nTujuan Pembelajaran: Siswa mampu mengenal kegiatan ekonomi masyarakat dan menganalisis contoh ekonomi kreatif di lingkungan sekitar. \nCocokkan dengan Capaian Pembelajaran Bab 5 pada dokumen Panduan Proyek IPAS SD.`
    }
];

function renderQuickPrompts() {
    const chatContainer = document.getElementById('chat-messages');
    if (!chatContainer) return;

    // Remove existing container to avoid duplicates
    const existing = document.getElementById('quick-prompts');
    if (existing && existing.parentElement) {
        existing.parentElement.removeChild(existing);
    }

    // Create container
    const wrap = document.createElement('div');
    wrap.id = 'quick-prompts';
    wrap.className = 'mt-2 space-y-2';

    if (Array.isArray(QUICK_PROMPTS) && QUICK_PROMPTS.length > 0) {
        const grid = document.createElement('div');
        grid.className = 'grid grid-cols-1 md:grid-cols-2 gap-2';

        QUICK_PROMPTS.forEach((p, idx) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'w-full text-left bg-white border border-indigo-100 hover:border-indigo-300 hover:bg-indigo-50 text-gray-800 rounded-xl px-4 py-3 shadow-sm transition-all';
            btn.innerHTML = `<span class="font-medium">${p.label}</span><br/><span class="text-xs text-gray-500">Klik untuk mengirim prompt</span>`;
            btn.addEventListener('click', () => sendQuickMessage(p.text));
            grid.appendChild(btn);
        });

        wrap.appendChild(grid);
    }

    chatContainer.appendChild(wrap);
}

// Prompt Sistem AI Pembelajaran IPAS SD berbasis SCAMPER
const CURRICULUM_SYSTEM_PROMPT = `You are an AI learning design assistant specialized in IPAS (Ilmu Pengetahuan Alam dan Sosial) for Indonesian Elementary School based on "Kurikulum Merdeka".
You have access to IPAS SD textbook materials stored in Supabase database (table: documents).

WORKFLOW:
1. User provides a Tujuan Pembelajaran (TP) for IPAS SD
2. You search and extract the most relevant Capaian Pembelajaran (CP), Bab, and Topik from the IPAS textbook in the database
3. Generate a complete learning document with SCAMPER methodology, LKPD template, and assessment rubric

MANDATORY OUTPUT FORMAT (MUST FOLLOW EXACTLY):

Tema Project: [tema sesuai bab yang ditemukan]

Capaian Pembelajaran (CP):
[CP yang ditemukan dari dokumen Supabase]

Tujuan Pembelajaran (TP):
[TP dari input user]

Aktivitas Pembelajaran (SCAMPER):
| No | Langkah SCAMPER | Aktivitas Guru | Aktivitas Siswa |
|----|-----------------|----------------|-----------------|
| 1  | Substitute      | [aktivitas guru spesifik] | [aktivitas siswa spesifik] |
| 2  | Combine         | [aktivitas guru spesifik] | [aktivitas siswa spesifik] |
| 3  | Adapt           | [aktivitas guru spesifik] | [aktivitas siswa spesifik] |
| 4  | Modify          | [aktivitas guru spesifik] | [aktivitas siswa spesifik] |
| 5  | Put to another use | [aktivitas guru spesifik] | [aktivitas siswa spesifik] |
| 6  | Eliminate       | [aktivitas guru spesifik] | [aktivitas siswa spesifik] |
| 7  | Rearrange       | [aktivitas guru spesifik] | [aktivitas siswa spesifik] |

LKPD (Lembar Kerja Peserta Didik):
*Identitas Proyek*
- Tema: [tema project]
- Bab: [bab dari dokumen]
- Topik: [topik spesifik]

*Tujuan Proyek*
[tujuan project yang jelas dan terukur]

*Alat dan Bahan*
- [alat 1]
- [alat 2]
- [bahan 1]
- [bahan 2]

*Langkah Kerja*
1. [langkah kerja 1]
2. [langkah kerja 2]
3. [langkah kerja 3]
4. [langkah kerja 4]
5. [langkah kerja 5]

*Panduan SCAMPER (untuk siswa)*
| Dimensi    | Pertanyaan Pemandu | Ide/Modifikasi |
|------------|--------------------|----------------|
| Substitute | Apa yang bisa diganti? | [contoh ide] |
| Combine    | Apa yang bisa digabungkan? | [contoh ide] |
| Adapt      | Apa yang bisa ditiru? | [contoh ide] |
| Modify     | Apa yang bisa diubah/tambah? | [contoh ide] |
| Put to Use | Apakah bisa digunakan untuk hal lain? | [contoh ide] |
| Eliminate  | Apa yang bisa dihapus? | [contoh ide] |
| Rearrange  | Apa yang bisa diatur ulang? | [contoh ide] |

*Pelaporan Hasil Proyek*
- Foto hasil karya
- Laporan singkat
- Presentasi kelompok

*Refleksi Siswa*
- Apa yang saya pelajari?
- Apa tantangan saya?
- Bagaimana memperbaikinya?

Penilaian Project (Rubrik):
| Aspek       | Indikator                    | Skor 1 | Skor 2 | Skor 3 | Skor 4 |
|-------------|-------------------------------|--------|--------|--------|--------|
| Observasi   | Ketelitian dalam pengamatan   | Kurang teliti | Cukup teliti | Teliti | Sangat teliti |
| Kreativitas | Inovasi ide & produk          | Kurang kreatif | Cukup kreatif | Kreatif | Sangat kreatif |
| Kerja Sama  | Kolaborasi dalam kelompok     | Kurang aktif | Cukup aktif | Aktif | Sangat aktif |
| Laporan     | Kerapian & kejelasan laporan  | Kurang rapi | Cukup rapi | Rapi | Sangat rapi |

GUIDELINES:
- Use Indonesian language consistently
- Follow Kurikulum Merdeka principles for IPAS SD
- Make activities age-appropriate for elementary students
- Ensure SCAMPER activities are practical and engaging
- Include safety considerations for hands-on activities
- If user asks unrelated questions, respond conversationally

JSON Structure for parsing:
{
  "tema": "[tema project]",
  "cp": "[CP dari dokumen]",
  "tp": "[TP dari user]",
  "source": {
    "book": "[nama buku IPAS]",
    "chapter": "[BAB yang relevan]",
    "topic": "[topik spesifik]"
  },
  "scamper_table": [
    {"no": "1", "langkah": "Substitute", "aktivitas_guru": "[aktivitas]", "aktivitas_siswa": "[aktivitas]"},
    {"no": "2", "langkah": "Combine", "aktivitas_guru": "[aktivitas]", "aktivitas_siswa": "[aktivitas]"},
    {"no": "3", "langkah": "Adapt", "aktivitas_guru": "[aktivitas]", "aktivitas_siswa": "[aktivitas]"},
    {"no": "4", "langkah": "Modify", "aktivitas_guru": "[aktivitas]", "aktivitas_siswa": "[aktivitas]"},
    {"no": "5", "langkah": "Put to another use", "aktivitas_guru": "[aktivitas]", "aktivitas_siswa": "[aktivitas]"},
    {"no": "6", "langkah": "Eliminate", "aktivitas_guru": "[aktivitas]", "aktivitas_siswa": "[aktivitas]"},
    {"no": "7", "langkah": "Rearrange", "aktivitas_guru": "[aktivitas]", "aktivitas_siswa": "[aktivitas]"}
  ],
  "lkpd": {
    "identitas": {
      "tema": "[tema]",
      "bab": "[bab]",
      "topik": "[topik]"
    },
    "tujuan": "[tujuan project]",
    "alat_bahan": ["[alat1]", "[bahan1]", "[alat2]", "[bahan2]"],
    "langkah_kerja": ["[langkah1]", "[langkah2]", "[langkah3]", "[langkah4]", "[langkah5]"],
    "panduan_scamper": [
      {"dimensi": "Substitute", "pertanyaan": "Apa yang bisa diganti?", "ide": "[ide]"},
      {"dimensi": "Combine", "pertanyaan": "Apa yang bisa digabungkan?", "ide": "[ide]"},
      {"dimensi": "Adapt", "pertanyaan": "Apa yang bisa ditiru?", "ide": "[ide]"},
      {"dimensi": "Modify", "pertanyaan": "Apa yang bisa diubah/tambah?", "ide": "[ide]"},
      {"dimensi": "Put to Use", "pertanyaan": "Apakah bisa digunakan untuk hal lain?", "ide": "[ide]"},
      {"dimensi": "Eliminate", "pertanyaan": "Apa yang bisa dihapus?", "ide": "[ide]"},
      {"dimensi": "Rearrange", "pertanyaan": "Apa yang bisa diatur ulang?", "ide": "[ide]"}
    ]
  },
  "rubrik": [
    {"aspek": "Observasi", "indikator": "Ketelitian dalam pengamatan", "skor1": "Kurang teliti", "skor2": "Cukup teliti", "skor3": "Teliti", "skor4": "Sangat teliti"},
    {"aspek": "Kreativitas", "indikator": "Inovasi ide & produk", "skor1": "Kurang kreatif", "skor2": "Cukup kreatif", "skor3": "Kreatif", "skor4": "Sangat kreatif"},
    {"aspek": "Kerja Sama", "indikator": "Kolaborasi dalam kelompok", "skor1": "Kurang aktif", "skor2": "Cukup aktif", "skor3": "Aktif", "skor4": "Sangat aktif"},
    {"aspek": "Laporan", "indikator": "Kerapian & kejelasan laporan", "skor1": "Kurang rapi", "skor2": "Cukup rapi", "skor3": "Rapi", "skor4": "Sangat rapi"}
  ]
}`


document.addEventListener('DOMContentLoaded', async () => {
    setActiveNav();
    
    currentUser = await authService.waitForAuthInit();

    if (currentUser) {
        // Chat history is disabled
    } else {
        // Handle user not logged in
        console.log("User not logged in");
        addMessageToChat("Anda harus login untuk memulai percakapan.", "ai");
    }

    // Hydrate from sessionStorage so refresh keeps messages
    hydrateFromStorage();

    // Render quick prompt buttons
    renderQuickPrompts();

    // Track scroll position and whether user is at bottom
    const chatContainerEl = document.getElementById('chat-messages');
    if (chatContainerEl) {
        chatContainerEl.addEventListener('scroll', () => {
            const state = ensureState();
            state.lastScroll = chatContainerEl.scrollTop;
            state.atBottom = Math.abs(chatContainerEl.scrollHeight - chatContainerEl.scrollTop - chatContainerEl.clientHeight) < 4;
            saveChatState(state);
        }, { passive: true });
    }

    // Setup event listeners
    function setupEventListeners() {
        const sendButton = document.getElementById('send-button');
        const chatInput = document.getElementById('chatInput');
        const fileUploadButton = document.getElementById('file-upload-button');
        const fileInput = document.getElementById('file-input');

        // Add click event to send button
        if (sendButton) {
            sendButton.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                sendMessage(e);
            };
        }

        // Add keypress event to input field
        if (chatInput) {
            chatInput.onkeypress = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    sendMessage(e);
                }
            };
        }

        // Setup file upload button
        if (fileUploadButton) {
            fileUploadButton.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (fileInput) fileInput.click();
            };
        }

        // Setup file input change event
        if (fileInput) {
            fileInput.onchange = handleFileUpload;
        }
    }

    // Initialize event listeners
    setupEventListeners();

    document.querySelectorAll('button[onclick^="sendQuickMessage"]').forEach(button => {
        const message = button.getAttribute('onclick').match(/'([^']+)'/)[1];
        button.removeAttribute('onclick'); // Hapus onclick inline
        button.addEventListener('click', () => sendQuickMessage(message));
    });
});

function setActiveNav() {
    document.querySelectorAll('.nav-button').forEach(button => {
        if (button.dataset.page === 'chat') {
            button.classList.add('active');
        }
    });
}



function addMessageToChat(message, sender, isLoading = false, timestamp = null) {
    const chatContainer = document.getElementById('chat-messages');
    if (!chatContainer) return;

    const messageId = `msg-${Date.now()}`;
    const time = timestamp ? new Date(timestamp.seconds * 1000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    let messageHTML;
    if (sender === 'user') {
        messageHTML = `
            <div class="flex items-start space-x-3 justify-end mb-4">
                <div class="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl rounded-br-none p-4 shadow-lg max-w-sm md:max-w-md">
                    <p class="text-sm leading-relaxed">${message}</p>
                    <span class="text-blue-200 text-xs block text-left mt-2">${time}</span>
                </div>
                <div class="w-10 h-10 bg-gradient-to-r from-emerald-400 to-cyan-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">👤</div>
            </div>
        `;
    } else { // AI sender
        const loadingIndicator = isLoading ? '<span class="typing" aria-label="AI is typing"><span></span><span></span><span></span></span>' : '';
        messageHTML = `
            <div id="${messageId}" class="flex items-start space-x-3 mb-4">
                <div class="w-10 h-10 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">🤖</div>
                <div class="bg-white rounded-2xl rounded-tl-none p-4 shadow-lg max-w-sm md:max-w-2xl border border-gray-100">
                    <p class="text-gray-800 text-sm leading-relaxed">${message} ${loadingIndicator}</p>
                    <span class="text-gray-400 text-xs block text-right mt-2">${time}</span>
                </div>
            </div>
        `;
    }
    chatContainer.insertAdjacentHTML('beforeend', messageHTML);
    
    // Auto-scroll to new message
    if (sender === 'user') {
        forceScrollToBottom(); // Immediate scroll for user messages
    } else {
        scrollToBottom(); // Smooth scroll for AI messages
    }
    
    // Persist message to sessionStorage
    if (!isHydrating) {
        try {
            const entry = {
                id: messageId,
                sender,
                text: message,
                isLoading,
                timestamp: Date.now()
            };
            pushMessageToState(entry);
        } catch (e) {
            console.warn('Failed to persist chat message:', e);
        }
    }

    return messageId;
}


// ===== State untuk melacak status percakapan =====
let conversationHistory = [];
let isFirstInteraction = true;

async function handleChatInteraction(prompt) {
    if (!currentUser) {
        addMessageToChat("Anda harus login untuk memulai percakapan.", "ai");
        return;
    }

    addMessageToChat(prompt, 'user');
    
    // Tambahkan ke riwayat percakapan
    conversationHistory.push({ sender: 'user', text: prompt });
    
    // Batasi riwayat untuk menghindari memori berlebihan
    if (conversationHistory.length > 10) {
        conversationHistory = conversationHistory.slice(-10);
    }

    const loadingMsgId = addMessageToChat('', 'ai', true);

    try {
        let responseText;
        const isCurriculumRequest = detectCurriculumRequest(prompt);
        
        // Deteksi apakah ini percakapan pertama atau sambungan
        const isGreeting = detectGreeting(prompt);
        const isFollowUp = conversationHistory.length > 1;
        const shouldIntroduce = isFirstInteraction && isGreeting;

        // Langkah 1: Ambil document_id dari URL (opsional)
        const urlParams = new URLSearchParams(window.location.search);
        let documentId = urlParams.get('document_id');

        // Langkah 2: Query dokumen dari Supabase
        let document;
        let error;

        if (documentId) {
            // Ambil dokumen spesifik
            console.log('🔍 Mengambil dokumen dengan ID:', documentId);
            const result = await supabase
                .from('documents')
                .select('id, file_name, text_content, page_count, processed_at')
                .eq('id', documentId)
                .maybeSingle();
            document = result.data;
            error = result.error;
        } else {
            // Ambil semua dokumen dan cari yang paling relevan
            console.log('🔍 Mencari dokumen yang relevan dari tabel documents...');
            const result = await supabase
                .from('documents')
                .select('id, file_name, text_content, page_count, processed_at')
                .order('created_at', { ascending: false });

            if (result.data && result.data.length > 0) {
                // Jika ada keyword spesifik dalam prompt, cari dokumen yang relevan
                const promptLower = prompt.toLowerCase();
                let selectedDocument = null;

                // Cari dokumen berdasarkan kata kunci dalam prompt
                // Gunakan prioritas pencarian dari yang paling spesifik
                let relevantDoc = null;

                // Prioritas 1: Cari berdasarkan format "bab : X" atau "bab X" yang eksplisit
                const babMatch = promptLower.match(/bab\s*:?\s*(\d+)/);
                if (babMatch) {
                    const babNumber = babMatch[1];
                    console.log(`🔍 Mencari dokumen untuk Bab ${babNumber}`);

                    relevantDoc = result.data.find(doc => {
                        if (!doc.text_content) return false;
                        const contentLower = doc.text_content.toLowerCase();
                        const fileNameLower = (doc.file_name || '').toLowerCase();

                        // Cek di file name terlebih dahulu (lebih akurat)
                        if (fileNameLower.includes(`bab ${babNumber}`) || fileNameLower.includes(`bab: ${babNumber}`)) {
                            return true;
                        }

                        // Kemudian cek di konten dengan kriteria spesifik per bab
                        switch(babNumber) {
                            case '1':
                                return contentLower.includes('lingkungan buatan') && contentLower.includes('fase a');
                            case '2':
                                return (contentLower.includes('siklus air') || contentLower.includes('diorama')) && contentLower.includes('fase b');
                            case '3':
                                return contentLower.includes('keanekaragaman') && contentLower.includes('fase b');
                            case '4':
                                return (contentLower.includes('tata surya') || contentLower.includes('sistem tata surya')) && contentLower.includes('fase c');
                            case '5':
                                return contentLower.includes('ekonomi kreatif') && contentLower.includes('fase c');
                            default:
                                return contentLower.includes(`bab ${babNumber}`);
                        }
                    });
                }

                // Prioritas 2: Jika tidak ditemukan dengan angka, cari berdasarkan kata kunci unik
                if (!relevantDoc) {
                    if (promptLower.includes('lingkungan buatan')) {
                        relevantDoc = result.data.find(doc => {
                            const contentLower = (doc.text_content || '').toLowerCase();
                            return contentLower.includes('lingkungan buatan') && contentLower.includes('fase a');
                        });
                    } else if (promptLower.includes('diorama siklus air') || promptLower.includes('siklus air')) {
                        relevantDoc = result.data.find(doc => {
                            const contentLower = (doc.text_content || '').toLowerCase();
                            return (contentLower.includes('siklus air') || contentLower.includes('diorama')) && contentLower.includes('fase b');
                        });
                    } else if (promptLower.includes('peta keanekaragaman') || promptLower.includes('keanekaragaman')) {
                        relevantDoc = result.data.find(doc => {
                            const contentLower = (doc.text_content || '').toLowerCase();
                            return contentLower.includes('keanekaragaman') && contentLower.includes('fase b');
                        });
                    } else if (promptLower.includes('sistem tata surya') || promptLower.includes('tata surya')) {
                        relevantDoc = result.data.find(doc => {
                            const contentLower = (doc.text_content || '').toLowerCase();
                            return (contentLower.includes('tata surya') || contentLower.includes('sistem tata surya')) && contentLower.includes('fase c');
                        });
                    } else if (promptLower.includes('ekonomi kreatif')) {
                        relevantDoc = result.data.find(doc => {
                            const contentLower = (doc.text_content || '').toLowerCase();
                            return contentLower.includes('ekonomi kreatif') && contentLower.includes('fase c');
                        });
                    }
                }

                // Jika masih tidak ditemukan, log untuk debugging
                if (!relevantDoc && babMatch) {
                    console.log(`❌ Tidak ditemukan dokumen untuk Bab ${babMatch[1]}`);
                    console.log(`📚 Dokumen tersedia:`, result.data.map(d => d.file_name));
                }

                // Jika ditemukan dokumen yang relevan, gunakan itu
                // Jika tidak, untuk percakapan umum gunakan semua dokumen
                if (relevantDoc) {
                    selectedDocument = relevantDoc;
                    console.log(`🎯 Dokumen relevan ditemukan: ${selectedDocument.file_name}`);
                    document = selectedDocument;
                } else {
                    // Untuk percakapan umum (tanpa kata kunci bab spesifik), gabungkan semua dokumen
                    console.log(`💬 Percakapan umum terdeteksi. Menggunakan semua dokumen untuk konteks lengkap.`);

                    document = {
                        id: 'all_documents_general',
                        file_name: `Semua Dokumen IPAS (${result.data.length} Bab)`,
                        text_content: result.data
                            .map(doc => {
                                const title = doc.file_name || 'Dokumen';
                                return `=== ${title.toUpperCase()} ===\n${doc.text_content || ''}\n`;
                            })
                            .filter(content => content.trim() !== '')
                            .join('\n=== DOKUMEN BERIKUTNYA ===\n'),
                        page_count: result.data.reduce((total, doc) => total + (doc.page_count || 0), 0),
                        processed_at: result.data[0]?.processed_at
                    };

                    console.log(`📚 Menggunakan gabungan dari ${result.data.length} dokumen IPAS`);
                }
            } else {
                document = null;
            }
            error = result.error;
        }

        if (error) {
            throw new Error(`Gagal mengambil dokumen: ${error.message}`);
        }

        if (!document) {
            throw new Error('Tidak ada dokumen ditemukan di tabel documents.');
        }

        if (!document.text_content) {
            throw new Error(`Dokumen "${document.file_name}" tidak memiliki text_content.`);
        }

        const documentText = document.text_content;
        const documentName = document.file_name || 'Dokumen Kurikulum';

        console.log(`✅ Dokumen aktif: ${documentName}`);

        // Langkah 3: Siapkan prompt ke AI dengan konteks percakapan
        let contextualPrompt;
        if (isCurriculumRequest) {
            contextualPrompt = `
${CURRICULUM_SYSTEM_PROMPT}

=== KONTEN DOKUMEN REFERENSI: ${documentName} ===
${documentText}
=== AKHIR KONTEN ===

Berdasarkan dokumen di atas, jawab permintaan pengguna:
${prompt}
            `.trim();
        } else {
            if (document.id === 'all_documents_general') {
                const isOffTopic = detectOffTopic(prompt);

                contextualPrompt = `
Anda adalah asisten AI yang ramah dan membantu dalam pembelajaran IPAS SD. Anda memiliki kepribadian yang hangat, sabar, dan mudah didekati seperti guru yang berpengalaman.

=== PENGETAHUAN UTAMA ANDA (SUMBER REFERENSI) ===
${documentText}
=== AKHIR PENGETAHUAN UTAMA ===

=== KONTEKS PERCAKAPAN ===
Status: ${shouldIntroduce ? 'PERKENALAN_PERTAMA' : isFollowUp ? 'SAMBUNGAN_PERCKAPAN' : 'PERCAKAPAN_UMUM'}
${isFollowUp ? 'Riwayat percakapan terbaru:\n' + conversationHistory.slice(-3).map(msg => `${msg.sender}: ${msg.text}`).join('\n') : ''}

PANDUAN RESPONS:
1. UNTUK PERKENALAN PERTAMA:
   - Sapa dengan ramah dan hangat 😊
   - Perkenalkan diri sebagai asisten pembelajaran IPAS SD
   - Sebutkan topik-topik yang bisa dibantu: Lingkungan Buatan, Siklus Air, Keanekaragaman, Tata Surya, Ekonomi Kreatif
   - JANGAN ulang perkenalan ini di percakapan selanjutnya

2. UNTUK SAMBUNGAN PERCAKAPAN:
   - Langsung jawab pertanyaan tanpa perkenalan ulang
   - Pertahankan sifat ramah dan membantu
   - Gunakan konteks dari riwayat percakapan jika relevan

3. UNTUK PERTANYAAN IPAS:
   - Gunakan pengetahuan dari dokumen di atas sebagai referensi utama
   - Berikan penjelasan yang mudah dipahami siswa SD
   - Berikan contoh konkret dan menarik

4. UNTUK PERTANYAAN DI LUAR TOPIK IPAS:
   - Tetap sopan dan antusias, jangan menolak secara kaku
   - Berikan respons singkat yang menunjukkan apresiasi
   - Arahkan kembali ke IPAS dengan cara yang natural dan menarik
   - Contoh: "Wah, itu topik yang menarik! Saya lebih ahli di bidang IPAS SD sih. Ngomong-ngomong, tahukah kamu tentang [topik IPAS yang menarik]? 🌟"

5. GAYA KOMUNIKASI:
   - Bahasa ramah, hangat, dan mudah dipahami
   - Gunakan emoji yang sesuai (tapi jangan berlebihan, maksimal 2 per respons)
   - Bersikap seperti kakak/teman yang suka membantu belajar
   - Kadang gunakan pertanyaan balik untuk membuat percakapan lebih interaktif
   - JANGAN ulangi perkenalan diri di setiap respons

Pertanyaan/Pesan: ${prompt}
            `.trim();
            } else {
                contextualPrompt = `
Anda adalah asisten AI yang ramah dan membantu dalam pembelajaran IPAS SD, dengan fokus khusus pada materi: "${documentName}".

=== MATERI PEMBELAJARAN SPESIFIK ===
${documentText}
=== AKHIR MATERI ===

PANDUAN RESPONS:
- Berikan jawaban yang ramah dan mudah dipahami
- Fokus pada materi dari dokumen di atas
- Jika pertanyaan di luar topik dokumen ini, tetap sopan dan arahkan ke materi yang tersedia
- Gunakan bahasa yang sesuai untuk siswa SD
- Sesekali gunakan emoji untuk membuat lebih menarik (maksimal 2)
- JANGAN perkenalkan diri berulang kali

Pertanyaan: ${prompt}
            `.trim();
            }
        }

        // Langkah 4: Kirim ke AI
        responseText = await getResponseWithContext(documentText, contextualPrompt);

        // Update status interaksi pertama
        if (isFirstInteraction) {
            isFirstInteraction = false;
        }

        // Tambahkan respons AI ke riwayat
        conversationHistory.push({ sender: 'ai', text: responseText });

        // Render respons
        if (isCurriculumRequest && responseText.includes('"cp":')) {
            renderCurriculumResponse(loadingMsgId, responseText);
        } else {
            const formattedResponse = formatAIResponse(responseText);
            updateMessage(loadingMsgId, formattedResponse);
        }

        setTimeout(() => scrollToBottom(), 200);

    } catch (error) {
        console.error('❌ Error:', error);
        const errorMessage = `⚠️ ${error.message || "Gagal memproses permintaan. Pastikan ada dokumen di tabel 'documents' dengan kolom 'text_content'."}`;
        updateMessage(loadingMsgId, errorMessage);

        scrollToBottom();
    }
}

// Enhanced smooth autoscroll function
function scrollToBottom() {
    const chatContainer = document.getElementById('chat-messages');
    if (!chatContainer) return;
    
    // Use setTimeout to ensure DOM is updated before scrolling
    setTimeout(() => {
        chatContainer.scrollTo({
            top: chatContainer.scrollHeight,
            behavior: 'smooth'
        });
    }, 100);
}

// Force scroll to bottom without animation (for immediate updates)
function forceScrollToBottom() {
    const chatContainer = document.getElementById('chat-messages');
    if (!chatContainer) return;
    
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

async function sendMessage(event) {
    // Prevent form submission if called from a form
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (message === '') return;
    
    // Clear input immediately for better UX
    input.value = '';
    
    try {
        await handleChatInteraction(message);
    } catch (error) {
        console.error('Error sending message:', error);
        // Show error message to user
        const chatContainer = document.getElementById('chat-messages');
        if (chatContainer) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'text-red-500 text-center p-2';
            errorDiv.textContent = 'Gagal mengirim pesan. Silakan coba lagi.';
            chatContainer.appendChild(errorDiv);
            scrollToBottom();
        }
    }
}

async function sendQuickMessage(message) {
    await handleChatInteraction(message);
}

function updateMessage(messageId, content) {
    const messageElement = document.getElementById(messageId);
    if (messageElement) {
        const contentP = messageElement.querySelector('p');
        // Prepare cleanContent in outer scope so we can persist it reliably
        let cleanContentForPersist = null;
        if (contentP) {
            // Remove asterisks and format content with proper line breaks
            let cleanContent = content.replace(/\*/g, '');
            
            // Format the content with proper line breaks and structure
            cleanContent = formatAIResponse(cleanContent);
            
            contentP.innerHTML = cleanContent;
            cleanContentForPersist = cleanContent;
            
            // Auto-scroll after content update
            setTimeout(() => {
                scrollToBottom();
            }, 150);
        }
        
        // Remove loading indicator (legacy .dot-flashing or new .typing)
        const loadingEl = messageElement.querySelector('.dot-flashing, .typing');
        if (loadingEl) {
            loadingEl.remove();
        }
        // Persist updated AI message content (if we have it)
        if (cleanContentForPersist !== null) {
            try {
                updateMessageInState(messageId, cleanContentForPersist);
            } catch (e) {
                console.warn('Failed to persist updated message:', e);
            }
        }
    }
}

async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
        addMessageToChat('Maaf, saat ini saya hanya bisa memproses file PDF.', 'ai');
        event.target.value = ''; // Reset file input
        return;
    }

    const loadingMsgId = addMessageToChat(`Menganalisis file: <b>${file.name}</b>...`, 'ai', true);
    
    // Show upload progress
    showNotification('Memulai upload PDF...', 'info');

    try {
        const pdfjsLib = window['pdfjs-dist/build/pdf'];
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js`;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const typedarray = new Uint8Array(e.target.result);
                const pdf = await pdfjsLib.getDocument(typedarray).promise;
                let textContent = '';
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const text = await page.getTextContent();
                    textContent += text.items.map(s => s.str).join(' \n');
                }
                fileContext = textContent;
                updateMessage(loadingMsgId, `Analisis <b>${file.name}</b> selesai. Sekarang Anda bisa bertanya tentang isi dokumen ini.`);
                setTimeout(() => {
                    scrollToBottom();
                }, 200); // Scroll after file upload completion
            } catch (pdfError) {
                console.error('Error parsing PDF:', pdfError);
                updateMessage(loadingMsgId, 'Gagal membaca konten PDF.');
                fileContext = null;
            }
        };
        reader.readAsArrayBuffer(file);

    } catch (error) {
        console.error('Error processing PDF:', error);
        updateMessage(loadingMsgId, 'Gagal memproses file PDF.');
        fileContext = null;
    }
}

// Function to detect IPAS SCAMPER learning requests
function detectCurriculumRequest(prompt) {
    const keywords = [
        'tujuan pembelajaran', 'tp', 'capaian pembelajaran', 'cp',
        'scamper', 'kurikulum merdeka', 'rpp', 'silabus', 'pembelajaran',
        'ipas', 'ilmu pengetahuan alam', 'ilmu pengetahuan sosial',
        'alur pembelajaran', 'lkpd', 'lembar kerja', 'project',
        'buatkan alur', 'generate', 'buat pembelajaran', 'aktivitas pembelajaran',
        'rubrik', 'penilaian', 'asesmen'
    ];
    return keywords.some(keyword => prompt.toLowerCase().includes(keyword));
}

// Function to detect if conversation is greeting or general chat
function detectGreeting(prompt) {
    const greetings = [
        'halo', 'hai', 'hello', 'hi', 'selamat pagi', 'selamat siang', 'selamat sore', 'selamat malam',
        'apa kabar', 'how are you', 'perkenalkan diri', 'kenalan', 'siapa kamu', 'kamu siapa'
    ];
    const promptLower = prompt.toLowerCase().trim();
    
    // Check for exact matches or very short greetings
    return greetings.some(greeting => 
        promptLower === greeting || 
        promptLower.startsWith(greeting + ' ') ||
        promptLower.includes(' ' + greeting)
    ) || promptLower.length < 5;
}

// Function to detect off-topic questions
function detectOffTopic(prompt) {
    const offTopicKeywords = [
        'sepak bola', 'musik', 'film', 'game', 'makanan', 'resep', 'politik', 'gosip',
        'artis', 'teknologi', 'programming', 'coding', 'komputer', 'hp', 'gadget',
        'matematika', 'bahasa inggris', 'sejarah', 'agama', 'olahraga'
    ];
    const promptLower = prompt.toLowerCase();
    return offTopicKeywords.some(keyword => promptLower.includes(keyword));
}

// Function to render curriculum response with table
function renderCurriculumResponse(messageId, responseText) {
    try {
        // Extract JSON from response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const curriculumData = JSON.parse(jsonMatch[0]);
            const tableHTML = generateCurriculumTable(curriculumData);
            const fullResponse = responseText.replace(jsonMatch[0], tableHTML);
            updateMessage(messageId, fullResponse);
            // Extra scroll for curriculum tables
            setTimeout(() => {
                scrollToBottom();
            }, 300);
        } else {
            updateMessage(messageId, responseText);
        }
    } catch (error) {
        console.error('Error parsing curriculum JSON:', error);
        updateMessage(messageId, responseText);
    }
}

// Function to generate HTML for IPAS SCAMPER learning document
function generateCurriculumTable(data) {
    if (!data.scamper_table || !Array.isArray(data.scamper_table)) return '';
    
    // Generate source citation if available
    let sourceHTML = '';
    if (data.source) {
        const { book, chapter, topic } = data.source;
        sourceHTML = `
            <div class="mb-4 p-3 bg-amber-50 border-l-4 border-amber-400 rounded-r-lg">
                <div class="flex items-center gap-2 mb-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-amber-600"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
                    <strong class="text-amber-800 text-sm">Sumber Referensi:</strong>
                </div>
                <p class="text-amber-700 text-sm">
                    ${book || 'Buku IPAS SD'} - ${chapter || 'BAB -'} - ${topic || 'Topik -'}
                </p>
            </div>
        `;
    }
    
    let documentHTML = `
        <div class="ipas-scamper-document mb-4">
            <!-- Header -->
            <div class="mb-6 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border-l-4 border-blue-500">
                <h2 class="text-xl font-bold text-blue-800 mb-2">📚 Dokumen Pembelajaran IPAS SD - SCAMPER</h2>
                <div class="text-sm text-blue-600">
                    <strong>Tema Project:</strong> ${data.tema || 'Tidak tersedia'}
                </div>
            </div>

            ${sourceHTML}

            <!-- CP dan TP -->
            <div class="grid md:grid-cols-2 gap-4 mb-6">
                <div class="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                    <h3 class="font-bold text-green-800 mb-2">🎯 Capaian Pembelajaran (CP)</h3>
                    <p class="text-sm text-green-700">${data.cp || 'Tidak tersedia'}</p>
                </div>
                <div class="p-4 bg-purple-50 rounded-lg border-l-4 border-purple-500">
                    <h3 class="font-bold text-purple-800 mb-2">🎯 Tujuan Pembelajaran (TP)</h3>
                    <p class="text-sm text-purple-700">${data.tp || 'Tidak tersedia'}</p>
                </div>
            </div>

            <!-- Aktivitas Pembelajaran SCAMPER -->
            <div class="mb-6">
                <h3 class="text-lg font-bold text-gray-800 mb-3 flex items-center">
                    <span class="mr-2">🔄</span> Aktivitas Pembelajaran (SCAMPER)
                </h3>
                <div class="overflow-x-auto">
                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                            <tr class="bg-blue-100">
                                <th class="border border-gray-300 px-3 py-2 text-left">No</th>
                                <th class="border border-gray-300 px-3 py-2 text-left">Langkah SCAMPER</th>
                                <th class="border border-gray-300 px-3 py-2 text-left">Aktivitas Guru</th>
                                <th class="border border-gray-300 px-3 py-2 text-left">Aktivitas Siswa</th>
                            </tr>
                        </thead>
                        <tbody>`;
    
    data.scamper_table.forEach(row => {
        documentHTML += `
            <tr class="hover:bg-gray-50">
                <td class="border border-gray-300 px-3 py-2 text-center">${row.no || ''}</td>
                <td class="border border-gray-300 px-3 py-2 font-medium">${row.langkah || ''}</td>
                <td class="border border-gray-300 px-3 py-2">${row.aktivitas_guru || ''}</td>
                <td class="border border-gray-300 px-3 py-2">${row.aktivitas_siswa || ''}</td>
            </tr>`;
    });
    
    documentHTML += `
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- LKPD Section -->
            <div class="mb-6 p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
                <h3 class="text-lg font-bold text-yellow-800 mb-4 flex items-center">
                    <span class="mr-2">📝</span> LKPD (Lembar Kerja Peserta Didik)
                </h3>
                
                <!-- Identitas Proyek -->
                <div class="mb-4">
                    <h4 class="font-semibold text-yellow-700 mb-2">📋 Identitas Proyek</h4>
                    <ul class="text-sm text-yellow-600 space-y-1">
                        <li><strong>Tema:</strong> ${data.lkpd?.identitas?.tema || data.tema || '-'}</li>
                        <li><strong>Bab:</strong> ${data.lkpd?.identitas?.bab || data.source?.chapter || '-'}</li>
                        <li><strong>Topik:</strong> ${data.lkpd?.identitas?.topik || data.source?.topic || '-'}</li>
                    </ul>
                </div>

                <!-- Tujuan Proyek -->
                <div class="mb-4">
                    <h4 class="font-semibold text-yellow-700 mb-2">🎯 Tujuan Proyek</h4>
                    <p class="text-sm text-yellow-600">${data.lkpd?.tujuan || 'Siswa dapat melakukan eksplorasi dan eksperimen sesuai tema pembelajaran'}</p>
                </div>

                <!-- Alat dan Bahan -->
                <div class="mb-4">
                    <h4 class="font-semibold text-yellow-700 mb-2">🛠️ Alat dan Bahan</h4>
                    <ul class="text-sm text-yellow-600 list-disc list-inside space-y-1">`;
    
    if (data.lkpd?.alat_bahan && Array.isArray(data.lkpd.alat_bahan)) {
        data.lkpd.alat_bahan.forEach(item => {
            documentHTML += `<li>${item}</li>`;
        });
    } else {
        documentHTML += `
            <li>Alat tulis</li>
            <li>Kertas observasi</li>
            <li>Kamera/HP untuk dokumentasi</li>
            <li>Bahan sesuai tema proyek</li>`;
    }
    
    documentHTML += `
                    </ul>
                </div>

                <!-- Langkah Kerja -->
                <div class="mb-4">
                    <h4 class="font-semibold text-yellow-700 mb-2">👣 Langkah Kerja</h4>
                    <ol class="text-sm text-yellow-600 list-decimal list-inside space-y-1">`;
    
    if (data.lkpd?.langkah_kerja && Array.isArray(data.lkpd.langkah_kerja)) {
        data.lkpd.langkah_kerja.forEach(langkah => {
            documentHTML += `<li>${langkah}</li>`;
        });
    } else {
        documentHTML += `
            <li>Amati objek/fenomena sesuai tema</li>
            <li>Catat hasil pengamatan</li>
            <li>Diskusikan dengan kelompok</li>
            <li>Buat rancangan proyek</li>
            <li>Laksanakan proyek sesuai rancangan</li>`;
    }
    
    documentHTML += `
                    </ol>
                </div>

                <!-- Panduan SCAMPER -->
                <div class="mb-4">
                    <h4 class="font-semibold text-yellow-700 mb-2">🔄 Panduan SCAMPER (untuk siswa)</h4>
                    <div class="overflow-x-auto">
                        <table class="w-full border-collapse border border-yellow-300 text-sm">
                            <thead>
                                <tr class="bg-yellow-200">
                                    <th class="border border-yellow-300 px-2 py-1 text-left">Dimensi</th>
                                    <th class="border border-yellow-300 px-2 py-1 text-left">Pertanyaan Pemandu</th>
                                    <th class="border border-yellow-300 px-2 py-1 text-left">Ide/Modifikasi</th>
                                </tr>
                            </thead>
                            <tbody>`;
    
    const defaultScamperGuide = [
        {dimensi: "Substitute", pertanyaan: "Apa yang bisa diganti?", ide: "Ganti bahan dengan yang lebih mudah didapat"},
        {dimensi: "Combine", pertanyaan: "Apa yang bisa digabungkan?", ide: "Gabungkan dua konsep menjadi satu"},
        {dimensi: "Adapt", pertanyaan: "Apa yang bisa ditiru?", ide: "Tiru cara kerja dari alam"},
        {dimensi: "Modify", pertanyaan: "Apa yang bisa diubah/tambah?", ide: "Ubah ukuran atau warna"},
        {dimensi: "Put to Use", pertanyaan: "Apakah bisa digunakan untuk hal lain?", ide: "Gunakan untuk keperluan lain"},
        {dimensi: "Eliminate", pertanyaan: "Apa yang bisa dihapus?", ide: "Hapus bagian yang tidak perlu"},
        {dimensi: "Rearrange", pertanyaan: "Apa yang bisa diatur ulang?", ide: "Atur ulang susunan atau urutan"}
    ];
    
    const scamperGuide = data.lkpd?.panduan_scamper || defaultScamperGuide;
    scamperGuide.forEach(item => {
        documentHTML += `
            <tr class="hover:bg-yellow-100">
                <td class="border border-yellow-300 px-2 py-1 font-medium">${item.dimensi}</td>
                <td class="border border-yellow-300 px-2 py-1">${item.pertanyaan}</td>
                <td class="border border-yellow-300 px-2 py-1">${item.ide}</td>
            </tr>`;
    });
    
    documentHTML += `
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Pelaporan dan Refleksi -->
                <div class="grid md:grid-cols-2 gap-4">
                    <div>
                        <h4 class="font-semibold text-yellow-700 mb-2">📸 Pelaporan Hasil Proyek</h4>
                        <ul class="text-sm text-yellow-600 list-disc list-inside space-y-1">
                            <li>Foto hasil karya</li>
                            <li>Laporan singkat</li>
                            <li>Presentasi kelompok</li>
                        </ul>
                    </div>
                    <div>
                        <h4 class="font-semibold text-yellow-700 mb-2">🤔 Refleksi Siswa</h4>
                        <ul class="text-sm text-yellow-600 list-disc list-inside space-y-1">
                            <li>Apa yang saya pelajari?</li>
                            <li>Apa tantangan saya?</li>
                            <li>Bagaimana memperbaikinya?</li>
                        </ul>
                    </div>
                </div>
            </div>

            <!-- Rubrik Penilaian -->
            <div class="mb-6 p-4 bg-red-50 rounded-lg border-l-4 border-red-500">
                <h3 class="text-lg font-bold text-red-800 mb-4 flex items-center">
                    <span class="mr-2">📊</span> Penilaian Project (Rubrik)
                </h3>
                <div class="overflow-x-auto">
                    <table class="w-full border-collapse border border-red-300 text-sm">
                        <thead>
                            <tr class="bg-red-200">
                                <th class="border border-red-300 px-3 py-2 text-left">Aspek</th>
                                <th class="border border-red-300 px-3 py-2 text-left">Indikator</th>
                                <th class="border border-red-300 px-3 py-2 text-center">Skor 1</th>
                                <th class="border border-red-300 px-3 py-2 text-center">Skor 2</th>
                                <th class="border border-red-300 px-3 py-2 text-center">Skor 3</th>
                                <th class="border border-red-300 px-3 py-2 text-center">Skor 4</th>
                            </tr>
                        </thead>
                        <tbody>`;
    
    const defaultRubrik = [
        {aspek: "Observasi", indikator: "Ketelitian dalam pengamatan", skor1: "Kurang teliti", skor2: "Cukup teliti", skor3: "Teliti", skor4: "Sangat teliti"},
        {aspek: "Kreativitas", indikator: "Inovasi ide & produk", skor1: "Kurang kreatif", skor2: "Cukup kreatif", skor3: "Kreatif", skor4: "Sangat kreatif"},
        {aspek: "Kerja Sama", indikator: "Kolaborasi dalam kelompok", skor1: "Kurang aktif", skor2: "Cukup aktif", skor3: "Aktif", skor4: "Sangat aktif"},
        {aspek: "Laporan", indikator: "Kerapian & kejelasan laporan", skor1: "Kurang rapi", skor2: "Cukup rapi", skor3: "Rapi", skor4: "Sangat rapi"}
    ];
    
    const rubrik = data.rubrik || defaultRubrik;
    rubrik.forEach(item => {
        documentHTML += `
            <tr class="hover:bg-red-100">
                <td class="border border-red-300 px-3 py-2 font-medium">${item.aspek}</td>
                <td class="border border-red-300 px-3 py-2">${item.indikator}</td>
                <td class="border border-red-300 px-3 py-2 text-center">${item.skor1}</td>
                <td class="border border-red-300 px-3 py-2 text-center">${item.skor2}</td>
                <td class="border border-red-300 px-3 py-2 text-center">${item.skor3}</td>
                <td class="border border-red-300 px-3 py-2 text-center">${item.skor4}</td>
            </tr>`;
    });
    
    documentHTML += `
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Action Buttons -->
            <div class="mt-6 flex flex-wrap gap-3 justify-center">
                <button onclick="exportToWord('${encodeURIComponent(JSON.stringify(data))}')"
                        class="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl text-sm font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14,2 14,8 20,8"/></svg>
                    Export ke Word
                </button>
                <button onclick="shareResult('${encodeURIComponent(JSON.stringify(data))}')"
                        class="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-3 rounded-xl text-sm font-medium hover:from-purple-700 hover:to-purple-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16,6 12,2 8,6"/><line x1="12" x2="12" y1="2" y2="15"/></svg>
                    Share
                </button>
            </div>
        </div>
    `;
    
    return documentHTML;
}

// Function to format AI response with proper structure
function formatAIResponse(content) {
    // Split content into paragraphs
    let formatted = content
        // Add line breaks before numbered lists
        .replace(/(\d+\.)\s/g, '<br><strong>$1</strong> ')
        // Add line breaks before bullet points
        .replace(/([•\-])\s/g, '<br>$1 ')
        // Add line breaks before section headers (words ending with colon)
        .replace(/([A-Za-z\s]+:)(?=\s[A-Z])/g, '<br><strong>$1</strong>')
        // Add line breaks after sentences ending with period (but not abbreviations)
        .replace(/([a-z])\. ([A-Z])/g, '$1.<br><br>$2')
        // Clean up multiple consecutive line breaks
        .replace(/<br>\s*<br>\s*<br>/g, '<br><br>')
        // Remove leading line breaks
        .replace(/^<br>/, '');
    
    return formatted;
}

// Export to Word function for IPAS SCAMPER document
window.exportToWord = function(dataStr) {
    try {
        const data = JSON.parse(decodeURIComponent(dataStr));
        
        // Generate source citation for Word document
        let sourceSection = '';
        if (data.source) {
            const { book, chapter, topic } = data.source;
            sourceSection = `
                <div class="source">
                    <h2>📚 Sumber Referensi</h2>
                    <p><strong>Buku:</strong> ${book || 'Buku IPAS SD'}</p>
                    <p><strong>Bab:</strong> ${chapter || 'BAB -'}</p>
                    <p><strong>Topik:</strong> ${topic || 'Topik -'}</p>
                </div>
            `;
        }
        
        let docContent = `
            <html>
            <head>
                <meta charset="utf-8">
                <title>Dokumen Pembelajaran IPAS SD - SCAMPER</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
                    h1 { color: #2563eb; text-align: center; border-bottom: 3px solid #3b82f6; padding-bottom: 10px; }
                    h2 { color: #1e40af; border-bottom: 2px solid #3b82f6; padding-bottom: 5px; margin-top: 25px; }
                    h3 { color: #1f2937; margin-top: 20px; }
                    h4 { color: #374151; margin-top: 15px; }
                    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
                    th, td { border: 1px solid #ccc; padding: 10px; text-align: left; vertical-align: top; }
                    th { background-color: #dbeafe; font-weight: bold; }
                    .info { background-color: #f0f9ff; padding: 15px; margin: 15px 0; border-left: 4px solid #3b82f6; }
                    .source { background-color: #fef3c7; padding: 15px; margin: 15px 0; border-left: 4px solid #f59e0b; }
                    .lkpd { background-color: #fefce8; padding: 15px; margin: 15px 0; border-left: 4px solid #eab308; }
                    .rubrik { background-color: #fef2f2; padding: 15px; margin: 15px 0; border-left: 4px solid #ef4444; }
                    ul, ol { margin: 10px 0; padding-left: 25px; }
                    li { margin: 5px 0; }
                    .tema-header { background-color: #eff6ff; padding: 15px; margin: 15px 0; border-radius: 8px; text-align: center; }
                </style>
            </head>
            <body>
                <h1>📚 Dokumen Pembelajaran IPAS SD - SCAMPER</h1>
                
                <div class="tema-header">
                    <h2 style="margin: 0; border: none;">Tema Project: ${data.tema || 'Tidak tersedia'}</h2>
                </div>

                ${sourceSection}

                <div class="info">
                    <h3>🎯 Capaian Pembelajaran (CP)</h3>
                    <p>${data.cp || 'Tidak tersedia'}</p>
                </div>

                <div class="info">
                    <h3>🎯 Tujuan Pembelajaran (TP)</h3>
                    <p>${data.tp || 'Tidak tersedia'}</p>
                </div>

                <h2>🔄 Aktivitas Pembelajaran (SCAMPER)</h2>
                <table>
                    <thead>
                        <tr>
                            <th style="width: 8%;">No</th>
                            <th style="width: 20%;">Langkah SCAMPER</th>
                            <th style="width: 36%;">Aktivitas Guru</th>
                            <th style="width: 36%;">Aktivitas Siswa</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        // Add SCAMPER table rows
        if (data.scamper_table && Array.isArray(data.scamper_table)) {
            data.scamper_table.forEach(row => {
                docContent += `
                    <tr>
                        <td style="text-align: center;">${row.no || ''}</td>
                        <td><strong>${row.langkah || ''}</strong></td>
                        <td>${row.aktivitas_guru || ''}</td>
                        <td>${row.aktivitas_siswa || ''}</td>
                    </tr>
                `;
            });
        }
        
        docContent += `
                    </tbody>
                </table>

                <div class="lkpd">
                    <h2>📝 LKPD (Lembar Kerja Peserta Didik)</h2>
                    
                    <h3>📋 Identitas Proyek</h3>
                    <ul>
                        <li><strong>Tema:</strong> ${data.lkpd?.identitas?.tema || data.tema || '-'}</li>
                        <li><strong>Bab:</strong> ${data.lkpd?.identitas?.bab || data.source?.chapter || '-'}</li>
                        <li><strong>Topik:</strong> ${data.lkpd?.identitas?.topik || data.source?.topic || '-'}</li>
                    </ul>

                    <h3>🎯 Tujuan Proyek</h3>
                    <p>${data.lkpd?.tujuan || 'Siswa dapat melakukan eksplorasi dan eksperimen sesuai tema pembelajaran'}</p>

                    <h3>🛠️ Alat dan Bahan</h3>
                    <ul>
        `;
        
        // Add tools and materials
        if (data.lkpd?.alat_bahan && Array.isArray(data.lkpd.alat_bahan)) {
            data.lkpd.alat_bahan.forEach(item => {
                docContent += `<li>${item}</li>`;
            });
        } else {
            docContent += `
                <li>Alat tulis</li>
                <li>Kertas observasi</li>
                <li>Kamera/HP untuk dokumentasi</li>
                <li>Bahan sesuai tema proyek</li>
            `;
        }
        
        docContent += `
                    </ul>

                    <h3>👣 Langkah Kerja</h3>
                    <ol>
        `;
        
        // Add work steps
        if (data.lkpd?.langkah_kerja && Array.isArray(data.lkpd.langkah_kerja)) {
            data.lkpd.langkah_kerja.forEach(langkah => {
                docContent += `<li>${langkah}</li>`;
            });
        } else {
            docContent += `
                <li>Amati objek/fenomena sesuai tema</li>
                <li>Catat hasil pengamatan</li>
                <li>Diskusikan dengan kelompok</li>
                <li>Buat rancangan proyek</li>
                <li>Laksanakan proyek sesuai rancangan</li>
            `;
        }
        
        docContent += `
                    </ol>

                    <h3>🔄 Panduan SCAMPER (untuk siswa)</h3>
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 20%;">Dimensi</th>
                                <th style="width: 40%;">Pertanyaan Pemandu</th>
                                <th style="width: 40%;">Ide/Modifikasi</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        // Add SCAMPER guide
        const defaultScamperGuide = [
            {dimensi: "Substitute", pertanyaan: "Apa yang bisa diganti?", ide: "Ganti bahan dengan yang lebih mudah didapat"},
            {dimensi: "Combine", pertanyaan: "Apa yang bisa digabungkan?", ide: "Gabungkan dua konsep menjadi satu"},
            {dimensi: "Adapt", pertanyaan: "Apa yang bisa ditiru?", ide: "Tiru cara kerja dari alam"},
            {dimensi: "Modify", pertanyaan: "Apa yang bisa diubah/tambah?", ide: "Ubah ukuran atau warna"},
            {dimensi: "Put to Use", pertanyaan: "Apakah bisa digunakan untuk hal lain?", ide: "Gunakan untuk keperluan lain"},
            {dimensi: "Eliminate", pertanyaan: "Apa yang bisa dihapus?", ide: "Hapus bagian yang tidak perlu"},
            {dimensi: "Rearrange", pertanyaan: "Apa yang bisa diatur ulang?", ide: "Atur ulang susunan atau urutan"}
        ];
        
        const scamperGuide = data.lkpd?.panduan_scamper || defaultScamperGuide;
        scamperGuide.forEach(item => {
            docContent += `
                <tr>
                    <td><strong>${item.dimensi}</strong></td>
                    <td>${item.pertanyaan}</td>
                    <td>${item.ide}</td>
                </tr>
            `;
        });
        
        docContent += `
                        </tbody>
                    </table>

                    <h3>📸 Pelaporan Hasil Proyek</h3>
                    <ul>
                        <li>Foto hasil karya</li>
                        <li>Laporan singkat</li>
                        <li>Presentasi kelompok</li>
                    </ul>

                    <h3>🤔 Refleksi Siswa</h3>
                    <ul>
                        <li>Apa yang saya pelajari?</li>
                        <li>Apa tantangan saya?</li>
                        <li>Bagaimana memperbaikinya?</li>
                    </ul>
                </div>

                <div class="rubrik">
                    <h2>📊 Penilaian Project (Rubrik)</h2>
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 15%;">Aspek</th>
                                <th style="width: 25%;">Indikator</th>
                                <th style="width: 15%;">Skor 1</th>
                                <th style="width: 15%;">Skor 2</th>
                                <th style="width: 15%;">Skor 3</th>
                                <th style="width: 15%;">Skor 4</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        // Add rubric
        const defaultRubrik = [
            {aspek: "Observasi", indikator: "Ketelitian dalam pengamatan", skor1: "Kurang teliti", skor2: "Cukup teliti", skor3: "Teliti", skor4: "Sangat teliti"},
            {aspek: "Kreativitas", indikator: "Inovasi ide & produk", skor1: "Kurang kreatif", skor2: "Cukup kreatif", skor3: "Kreatif", skor4: "Sangat kreatif"},
            {aspek: "Kerja Sama", indikator: "Kolaborasi dalam kelompok", skor1: "Kurang aktif", skor2: "Cukup aktif", skor3: "Aktif", skor4: "Sangat aktif"},
            {aspek: "Laporan", indikator: "Kerapian & kejelasan laporan", skor1: "Kurang rapi", skor2: "Cukup rapi", skor3: "Rapi", skor4: "Sangat rapi"}
        ];
        
        const rubrik = data.rubrik || defaultRubrik;
        rubrik.forEach(item => {
            docContent += `
                <tr>
                    <td><strong>${item.aspek}</strong></td>
                    <td>${item.indikator}</td>
                    <td style="text-align: center;">${item.skor1}</td>
                    <td style="text-align: center;">${item.skor2}</td>
                    <td style="text-align: center;">${item.skor3}</td>
                    <td style="text-align: center;">${item.skor4}</td>
                </tr>
            `;
        });
        
        docContent += `
                        </tbody>
                    </table>
                </div>

                <p style="text-align: center; margin-top: 40px; color: #6b7280; font-style: italic; border-top: 1px solid #e5e7eb; padding-top: 20px;">
                    📚 Dibuat dengan AI Pembelajaran IPAS SD - SCAMPER<br>
                    🎯 Kurikulum Merdeka - Sekolah Dasar
                </p>
            </body>
            </html>
        `;
        
        const blob = new Blob([docContent], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Pembelajaran_IPAS_SCAMPER_${data.tema?.replace(/\s+/g, '_') || 'Dokumen'}.doc`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showNotification('📄 Dokumen IPAS SCAMPER berhasil diunduh!', 'success');
    } catch (error) {
        console.error('Error exporting to Word:', error);
        showNotification('❌ Gagal mengekspor dokumen', 'error');
    }
}

// Function to copy JSON to clipboard
window.copyJSON = function(dataStr) {
    try {
        const formattedJSON = JSON.stringify(JSON.parse(dataStr.replace(/&quot;/g, '"')), null, 2);
        navigator.clipboard.writeText(formattedJSON).then(() => {
            showNotification('JSON berhasil disalin ke clipboard!', 'success');
        });
    } catch (error) {
        console.error('Error copying JSON:', error);
        showNotification('Gagal menyalin JSON', 'error');
    }
}

// Function to show notifications
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white ${ 
        type === 'success' ? 'bg-green-500' : 
        type === 'error' ? 'bg-red-500' : 'bg-blue-500'
    }`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// Share result function
window.shareResult = function(dataStr) {
    try {
        const data = JSON.parse(decodeURIComponent(dataStr));
        const shareText = `Rencana Pembelajaran SCAMPER\n\nCP: ${data.cp}\n\nTP: ${data.tp}\n\nDibuat dengan Perencana Proyek AI`;
        
        if (navigator.share) {
            navigator.share({
                title: 'Rencana Pembelajaran SCAMPER',
                text: shareText,
                url: window.location.href
            });
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(shareText).then(() => {
                showNotification('Link dan ringkasan berhasil disalin!', 'success');
            });
        }
    } catch (error) {
        console.error('Error sharing result:', error);
        showNotification('Gagal membagikan hasil', 'error');
    }
}
