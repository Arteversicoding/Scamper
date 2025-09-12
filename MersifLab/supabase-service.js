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
