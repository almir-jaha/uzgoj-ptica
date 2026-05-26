import { supabase } from '$lib/supabase/client';

type Bucket = 'ptice' | 'uzgajivaci';

export async function uploadImage(bucket: Bucket, userId: string, file: File): Promise<string> {
	const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
	const path = `${userId}/${Date.now()}.${ext}`;

	const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
	if (error) throw new Error(error.message);

	const { data } = supabase.storage.from(bucket).getPublicUrl(path);
	return data.publicUrl;
}

export async function deleteImage(bucket: Bucket, url: string): Promise<void> {
	const path = url.split(`/${bucket}/`)[1];
	if (!path) return;
	await supabase.storage.from(bucket).remove([path]);
}
