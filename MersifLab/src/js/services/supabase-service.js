import { createClient } from 'https://unpkg.com/@supabase/supabase-js@2';

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

// PDF Extracts Management
const PDF_EXTRACTS_TABLE = 'pdf_extracts';

/**
 * Save PDF extract to Supabase
 * @param {Object} pdfData - PDF data to save
 * @param {string} pdfData.user_id - User ID
 * @param {string} pdfData.file_name - Original file name
 * @param {string} pdfData.text_content - Extracted text content
 * @param {number} pdfData.page_count - Number of pages
 * @returns {Promise<Object>} - Saved PDF extract data
 */
export async function savePdfExtract({ user_id, file_name, text_content, page_count }) {
    try {
        const { data, error } = await supabase
            .from(PDF_EXTRACTS_TABLE)
            .insert([
                {
                    user_id,
                    file_name,
                    text_content,
                    page_count,
                    processed_at: new Date().toISOString()
                }
            ])
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error saving PDF extract:', error);
        throw error;
    }
}

/**
 * Get PDF extract by ID
 * @param {string} extractId - PDF extract ID
 * @returns {Promise<Object>} - PDF extract data
 */
export async function getPdfExtract(extractId) {
    try {
        const { data, error } = await supabase
            .from(PDF_EXTRACTS_TABLE)
            .select('*')
            .eq('id', extractId)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error getting PDF extract:', error);
        throw error;
    }
}

/**
 * Get all PDF extracts for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Array of PDF extracts
 */
export async function getUserPdfExtracts(userId) {
    try {
        const { data, error } = await supabase
            .from(PDF_EXTRACTS_TABLE)
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error getting user PDF extracts:', error);
        throw error;
    }
}

/**
 * Delete PDF extract by ID
 * @param {string} extractId - PDF extract ID
 * @returns {Promise<Object>} - Deletion result
 */
export async function deletePdfExtract(extractId) {
    try {
        const { data, error } = await supabase
            .from(PDF_EXTRACTS_TABLE)
            .delete()
            .eq('id', extractId);

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error deleting PDF extract:', error);
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
