import { supabase } from '../lib/supabase';

/**
 * Upload a file to Supabase Storage
 */
export async function uploadFileToStorage(
  bucket: string,
  path: string,
  file: Blob | File,
  userId: string
): Promise<{ url: string | null; error: Error | null }> {
  try {
    const fileName = `${userId}/${Date.now()}_${path}`;
    const { error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      return { url: null, error: error as Error };
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return { url: urlData.publicUrl, error: null };
  } catch (err) {
    return { url: null, error: err as Error };
  }
}

/**
 * Save activity log to Supabase database
 */
export async function saveActivityLog(
  userId: string,
  action: string,
  filename: string,
  fileUrl?: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.from('activity_logs').insert({
      user_id: userId,
      action,
      filename,
      file_url: fileUrl,
    });

    if (error) {
      return { error: error as Error };
    }

    return { error: null };
  } catch (err) {
    return { error: err as Error };
  }
}

/**
 * Get activity logs for a user
 */
export async function getUserActivityLogs(userId: string) {
  try {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}
