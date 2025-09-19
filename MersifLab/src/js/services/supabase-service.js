import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js';

// Supabase configuration
const SUPABASE_URL = "https://zlcislycukayjgjhozjy.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsY2lzbHljdWtheWpnamhvemp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzOTcyNTcsImV4cCI6MjA3MTk3MzI1N30.XF_hxADjk1azFH3PfqK1i_edNlFLwPeZuzXvPmAx4XM";
const BUCKET = "upload";

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Upload file to Supabase Storage
export async function uploadFileToSupabase(file) {
    try {
        console.log('🔄 Supabase: Mulai upload file...');
        console.log('📁 File info:', { name: file.name, size: file.size, type: file.type });
        console.log('🔗 Supabase URL:', SUPABASE_URL);
        console.log('📦 Bucket:', BUCKET);
        
        const filePath = `${Date.now()}-${file.name}`;
        console.log('🛤️ File path:', filePath);
        
        console.log('📤 Uploading to Supabase...');
        const { data, error } = await supabase.storage.from(BUCKET).upload(filePath, file);
        
        if (error) {
            console.error('❌ Supabase upload error:', error);
            throw new Error(`Upload gagal: ${error.message}`);
        }
        
        console.log('✅ Upload berhasil, data:', data);
        
        // Get public URL for the uploaded file
        console.log('🔗 Getting public URL...');
        const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
        console.log('🌐 Public URL data:', urlData);
        
        const result = {
            path: filePath,
            publicUrl: urlData.publicUrl,
            fileName: file.name
        };
        
        console.log('🎯 Result:', result);
        return result;
        
    } catch (error) {
        console.error('💥 Error in uploadFileToSupabase:', error);
        throw error;
    }
}

// List all files from Supabase Storage
export async function listFilesFromSupabase() {
    const { data, error } = await supabase.storage.from(BUCKET).list("", { limit: 100 });
    
    if (error) {
        throw new Error(`Gagal mengambil daftar file: ${error.message}`);
    }
    
    // Get public URLs for all files
    const filesWithUrls = data.map(file => {
        const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(file.name);
        return {
            name: file.name,
            path: file.name,
            publicUrl: urlData.publicUrl,
            size: file.metadata?.size || 0,
            updated_at: file.updated_at
        };
    });
    
    return filesWithUrls;
}

// Delete file from Supabase Storage
export async function deleteFileFromSupabase(filePath) {
    const { error } = await supabase.storage.from(BUCKET).remove([filePath]);

    if (error) {
        throw new Error(`Gagal menghapus file: ${error.message}`);
    }

    return true;
}

// Get documents from table 'documents' with text_content
export async function getDocumentsFromTable() {
    try {
        console.log('🔄 Mengambil dokumen dari table documents...');

        const { data, error } = await supabase
            .from('documents')
            .select('id, file_name, text_content, page_count, processed_at, created_at')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('❌ Error mengambil data dari table documents:', error);
            throw new Error(`Gagal mengambil dokumen: ${error.message}`);
        }

        if (!data || data.length === 0) {
            console.log('❌ Tidak ada dokumen ditemukan di table documents');
            return [];
        }

        console.log('✅ Berhasil mengambil', data.length, 'dokumen dari table documents');

        // Convert data to format similar to file listing
        const documentsWithPreview = data.map(doc => {
            return {
                id: doc.id,
                name: doc.file_name || 'Dokumen Tanpa Nama',
                text_content: doc.text_content,
                page_count: doc.page_count || 0,
                processed_at: doc.processed_at,
                created_at: doc.created_at,
                // Add preview of text_content (first 200 characters)
                preview: doc.text_content ? doc.text_content.substring(0, 200) + '...' : 'Tidak ada konten',
                size: doc.text_content ? doc.text_content.length : 0
            };
        });

        return documentsWithPreview;

    } catch (error) {
        console.error('💥 Error in getDocumentsFromTable:', error);
        throw error;
    }
}
