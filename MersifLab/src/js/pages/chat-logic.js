import { getChatResponse, getResponseWithContext } from '../services/gemini-service.js';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authService } from '../services/auth-service.js';
import { db } from '../services/firebase-init.js';
import { 
    collection, 
    addDoc, 
    query, 
    where, 
    orderBy, 
    onSnapshot,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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

// Prompt Sistem Desain Kurikulum SCAMPER
const CURRICULUM_SYSTEM_PROMPT = `You are an AI learning design assistant specialized in the Indonesian "Kurikulum Merdeka".
You are integrated with a PDF embedding system so you can read and extract knowledge from any PDF book uploaded by the user.

WORKFLOW:
The user uploads a PDF book (e.g., Panduan Proyek IPAS, but it can be any curriculum guide).
The user provides a Tujuan Pembelajaran (TP).
Your tasks:
a. Identify and extract the most relevant Capaian Pembelajaran (CP) from the uploaded PDF dataset.
b. Generate a structured learning flow using the SCAMPER model in sequential order (Substitute → Combine → Adapt → Modify → Put to another use → Eliminate → Rearrange).

OUTPUT FORMAT:
At the very top of your response, always show the extracted CP that matches the TP.
After CP, provide a clean and professional table with columns:
Pertemuan
Langkah
SCAMPER Project
Aktivitas Guru
The table must be concise, clear, and to the point.

GUIDELINES:
Use Indonesian language consistently (for TP, CP, Aktivitas Guru).
Strictly follow Kurikulum Merdeka principles.
Do not include formatting symbols such as asterisks, markdown, or bullet points.
Do not add unnecessary explanations outside CP and the table.
If the user asks something unrelated to TP/CP, respond conversationally as a normal chatbot.
Your answers must always be jelas, padat, dan to the point.

JSON Structure:
{
  "cp": "[Exact CP text from uploaded PDF]",
  "tp": "[User provided TP]",
  "source": {
    "book": "[PDF book title]",
    "chapter": "BAB [nomor]",
    "page": "[nomor halaman akurat]",
    "section": "[bagian spesifik jika ada]"
  },
  "table": [
    {"Pertemuan": "1", "Langkah": "Substitute", "SCAMPER": "S", "Aktivitas Guru": "[tindakan guru spesifik]"},
    {"Pertemuan": "2", "Langkah": "Combine", "SCAMPER": "C", "Aktivitas Guru": "[tindakan guru spesifik]"},
    {"Pertemuan": "3", "Langkah": "Adapt", "SCAMPER": "A", "Aktivitas Guru": "[tindakan guru spesifik]"},
    {"Pertemuan": "4", "Langkah": "Modify", "SCAMPER": "M", "Aktivitas Guru": "[tindakan guru spesifik]"},
    {"Pertemuan": "5", "Langkah": "Put to another use", "SCAMPER": "P", "Aktivitas Guru": "[tindakan guru spesifik]"},
    {"Pertemuan": "6", "Langkah": "Eliminate", "SCAMPER": "E", "Aktivitas Guru": "[tindakan guru spesifik]"},
    {"Pertemuan": "7", "Langkah": "Rearrange", "SCAMPER": "R", "Aktivitas Guru": "[tindakan guru spesifik]"}
  ]
}`


document.addEventListener('DOMContentLoaded', async () => {
    setActiveNav();
    
    currentUser = await authService.waitForAuthInit();

    if (currentUser) {
        loadChatHistory(currentUser.uid);
    } else {
        // Handle user not logged in
        console.log("User not logged in");
        addMessageToChat("Anda harus login untuk memulai percakapan.", "ai");
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

function loadChatHistory(userId) {
    const chatContainer = document.getElementById('chat-messages');
    const q = query(collection(db, "chat_messages"), where("userId", "==", userId), orderBy("timestamp"));

    onSnapshot(q, (querySnapshot) => {
        // Clear all messages except the welcome message and quick suggestions
        const welcomeMessage = chatContainer.querySelector('.flex.items-start.space-x-3');
        const quickSuggestions = chatContainer.querySelector('.pt-4');
        chatContainer.innerHTML = ''; // Clear chat
        if (welcomeMessage) chatContainer.appendChild(welcomeMessage);
        if (quickSuggestions) chatContainer.appendChild(quickSuggestions);

        querySnapshot.forEach((doc) => {
            const message = doc.data();
            addMessageToChat(message.message, message.sender, false, message.timestamp);
        });
        forceScrollToBottom();
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
        const loadingIndicator = isLoading ? '<div class="dot-flashing"></div>' : '';
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
    
    return messageId;
}


async function handleChatInteraction(prompt) {
    if (!currentUser) {
        addMessageToChat("Anda harus login untuk memulai percakapan.", "ai");
        return;
    }

    addMessageToChat(prompt, 'user');
    await addDoc(collection(db, "chat_messages"), {
        userId: currentUser.uid,
        message: prompt,
        sender: 'user',
        timestamp: serverTimestamp()
    });

    const loadingMsgId = addMessageToChat('', 'ai', true);

    try {
        let responseText;
        const isCurriculumRequest = detectCurriculumRequest(prompt);

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
            // Ambil dokumen terbaru
            console.log('🆕 Mengambil dokumen terbaru dari tabel documents...');
            const result = await supabase
                .from('documents')
                .select('id, file_name, text_content, page_count, processed_at')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            document = result.data;
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

        // Langkah 3: Siapkan prompt ke AI
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
            contextualPrompt = `
Anda adalah asisten AI yang membantu berdasarkan dokumen: "${documentName}".

=== ISI DOKUMEN ===
${documentText}
=== AKHIR ISI ===

Pertanyaan: ${prompt}
            `.trim();
        }

        // Langkah 4: Kirim ke AI
        responseText = await getResponseWithContext(documentText, contextualPrompt, []);

        // Tambahkan catatan sumber
        responseText += `

📌 *Berdasarkan dokumen: "${documentName}" (ID: ${document.id})*`;

        await addDoc(collection(db, "chat_messages"), {
            userId: currentUser.uid,
            message: responseText,
            sender: 'ai',
            timestamp: serverTimestamp()
        });

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
        await addDoc(collection(db, "chat_messages"), {
            userId: currentUser.uid,
            message: errorMessage,
            sender: 'ai',
            timestamp: serverTimestamp()
        });
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
        if (contentP) {
            // Remove asterisks and format content with proper line breaks
            let cleanContent = content.replace(/\*/g, '');
            
            // Format the content with proper line breaks and structure
            cleanContent = formatAIResponse(cleanContent);
            
            contentP.innerHTML = cleanContent;
            
            // Auto-scroll after content update
            setTimeout(() => {
                scrollToBottom();
            }, 150);
        }
        
        // Remove loading indicator (dot-flashing)
        const loadingDiv = messageElement.querySelector('.dot-flashing');
        if (loadingDiv) {
            loadingDiv.remove();
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

// Function to detect curriculum design requests
function detectCurriculumRequest(prompt) {
    const keywords = ['tujuan pembelajaran', 'tp', 'capaian pembelajaran', 'cp', 'scamper', 'kurikulum merdeka', 'rpp', 'silabus', 'pembelajaran'];
    return keywords.some(keyword => prompt.toLowerCase().includes(keyword));
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

// Function to generate HTML table from curriculum data
function generateCurriculumTable(data) {
    if (!data.table || !Array.isArray(data.table)) return '';
    
    // Generate source citation if available
    let sourceHTML = '';
    if (data.source) {
        const { book, chapter, page, section } = data.source;
        sourceHTML = `
            <div class="mb-4 p-3 bg-amber-50 border-l-4 border-amber-400 rounded-r-lg">
                <div class="flex items-center gap-2 mb-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-amber-600"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
                    <strong class="text-amber-800 text-sm">Sumber Referensi:</strong>
                </div>
                <p class="text-amber-700 text-sm">
                    ${book || 'Panduan Pembelajaran dan Asesmen Kurikulum Merdeka'}, ${chapter || 'BAB -'}, Halaman ${page || '-'}${section ? `, ${section}` : ''}
                </p>
            </div>
        `;
    }
    
    let tableHTML = `
        <div class="curriculum-response mb-4">
            <div class="mb-3">
                <strong>Capaian Pembelajaran (CP):</strong> ${data.cp || 'Tidak tersedia'}
            </div>
            <div class="mb-3">
                <strong>Tujuan Pembelajaran (TP):</strong> ${data.tp || 'Tidak tersedia'}
            </div>
            ${sourceHTML}
            <div class="table-container overflow-x-auto">
                <table class="curriculum-table w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr class="bg-blue-100">
                            <th class="border border-gray-300 px-3 py-2 text-left">Pertemuan</th>
                            <th class="border border-gray-300 px-3 py-2 text-left">Langkah</th>
                            <th class="border border-gray-300 px-3 py-2 text-left">SCAMPER Project</th>
                            <th class="border border-gray-300 px-3 py-2 text-left">Aktivitas Guru</th>
                        </tr>
                    </thead>
                    <tbody>
    `;
    
    data.table.forEach(row => {
        tableHTML += `
            <tr class="hover:bg-gray-50">
                <td class="border border-gray-300 px-3 py-2">${row.Pertemuan || ''}</td>
                <td class="border border-gray-300 px-3 py-2">${row.Langkah || ''}</td>
                <td class="border border-gray-300 px-3 py-2">${row.SCAMPER || ''}</td>
                <td class="border border-gray-300 px-3 py-2">${row['Aktivitas Guru'] || ''}</td>
            </tr>
        `;
    });
    
    tableHTML += `
                    </tbody>
                </table>
            </div>
            <div class="mt-6 flex flex-wrap gap-3 justify-center">
                <button onclick="exportToWord('${JSON.stringify(data).replace(/"/g, '&quot;')}')"
                        class="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl text-sm font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14,2 14,8 20,8"/></svg>
                    Export ke Word
                </button>
                <button onclick="copyJSON('${JSON.stringify(data).replace(/"/g, '&quot;')}')"
                        class="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-xl text-sm font-medium hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                    Copy JSON
                </button>
                <button onclick="shareResult('${JSON.stringify(data).replace(/"/g, '&quot;')}')"
                        class="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-3 rounded-xl text-sm font-medium hover:from-purple-700 hover:to-purple-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16,6 12,2 8,6"/><line x1="12" x2="12" y1="2" y2="15"/></svg>
                    Share
                </button>
            </div>
        </div>
    `;
    
    return tableHTML;
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

// Export to Word function
function exportToWord(dataStr) {
    try {
        const data = JSON.parse(dataStr.replace(/&quot;/g, '"'));
        
        // Generate source citation for Word document
        let sourceSection = '';
        if (data.source) {
            const { book, chapter, page, section } = data.source;
            sourceSection = "\n                <div class=\"source\">\n                    <h2>Sumber Referensi</h2>\n                    <p><strong>Dokumen:</strong> " + (book || 'Panduan Pembelajaran dan Asesmen Kurikulum Merdeka') + "</p>\n                    <p><strong>Bab:</strong> " + (chapter || 'BAB -') + "</p>\n                    <p><strong>Halaman:</strong> " + (page || '-') + "</p>\n                    " + (section ? `<p><strong>Bagian:</strong> ${section}</p>` : '') + "\n                </div>\n            ";
        }
        
        let docContent = "\n            <html>\n            <head>\n                <meta charset=\"utf-8\">\n                <title>Rencana Pembelajaran SCAMPER</title>\n                <style>\n                    body { font-family: Arial, sans-serif; margin: 20px; }\n                    h1 { color: #2563eb; text-align: center; }\n                    h2 { color: #1e40af; border-bottom: 2px solid #3b82f6; padding-bottom: 5px; }\n                    table { width: 100%; border-collapse: collapse; margin: 20px 0; }\n                    th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }\n                    th { background-color: #dbeafe; font-weight: bold; }\n                    .info { background-color: #f0f9ff; padding: 10px; margin: 10px 0; border-left: 4px solid #3b82f6; }\n                    .source { background-color: #fef3c7; padding: 10px; margin: 10px 0; border-left: 4px solid #f59e0b; }\n                </style>\n            </head>\n            <body>\n                <h1>Rencana Pembelajaran SCAMPER</h1>\n                <div class=\"info\">\n                    <h2>Capaian Pembelajaran (CP)</h2>\n                    <p>" + (data.cp || 'Tidak tersedia') + "</p>\n                </div>\n                <div class=\"info\">\n                    <h2>Tujuan Pembelajaran (TP)</h2>\n                    <p>" + (data.tp || 'Tidak tersedia') + "</p>\n                </div>\n                " + sourceSection + "\n                <h2>Rencana Kegiatan Pembelajaran</h2>\n                <table>\n                    <thead>\n                        <tr>\n                            <th>Pertemuan</th>\n                            <th>Langkah</th>\n                            <th>SCAMPER Project</th>\n                            <th>Aktivitas Guru</th>\n                        </tr>\n                    </thead>\n                    <tbody>\n        ";
        
        data.table.forEach(row => {
            docContent += "\n                <tr>\n                    <td>" + (row.Pertemuan || '') + "</td>\n                    <td>" + (row.Langkah || '') + "</td>\n                    <td>" + (row.SCAMPER || '') + "</td>\n                    <td>" + (row['Aktivitas Guru'] || '') + "</td>\n                </tr>\n            ";
        });
        
        docContent += "\n                    </tbody>\n                </table>\n                <p style=\"text-align: center; margin-top: 30px; color: #6b7280; font-style: italic;\">\n                    Dibuat dengan Perencana Proyek AI - Kurikulum Merdeka\n                </p>\n            </body>\n            </html>\n        ";
        
        const blob = new Blob([docContent], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Rencana_Pembelajaran_SCAMPER.doc';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showNotification('File Word berhasil diunduh!', 'success');
    } catch (error) {
        console.error('Error exporting to Word:', error);
        showNotification('Gagal mengekspor ke Word', 'error');
    }
}

// Function to copy JSON to clipboard
function copyJSON(dataStr) {
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
function shareResult(dataStr) {
    try {
        const data = JSON.parse(dataStr.replace(/&quot;/g, '"'));
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

