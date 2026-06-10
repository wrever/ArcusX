import type { SupabaseClient } from '@supabase/supabase-js';

const ALLOWED_AVATAR = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const MAX_AVATAR = 5 * 1024 * 1024;
const MAX_TASK_FILE = 10 * 1024 * 1024;
const MAX_EVIDENCE_FILE = 10 * 1024 * 1024;
const ALLOWED_EVIDENCE = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'text/plain',
  'video/mp4',
  'video/webm',
]);

export function supabasePublicUrl(bucket: string, path: string): string {
  const base = Deno.env.get('SUPABASE_URL') ?? Deno.env.get('ARCUSX_SUPABASE_URL') ?? '';
  return `${base}/storage/v1/object/public/${bucket}/${path}`;
}

export async function uploadAvatarFile(
  supabase: SupabaseClient,
  userId: number,
  file: File,
): Promise<string> {
  if (!ALLOWED_AVATAR.has(file.type)) {
    throw new Error('Tipo de archivo no permitido. Usa JPG, PNG o WEBP');
  }
  if (file.size > MAX_AVATAR) {
    throw new Error('El archivo es demasiado grande. Máximo 5MB');
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${userId}/${userId}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${ext}`;

  const buf = new Uint8Array(await file.arrayBuffer());
  const { error } = await supabase.storage.from('avatars').upload(path, buf, {
    contentType: file.type,
    upsert: true,
  });
  if (error) throw new Error(error.message);

  return supabasePublicUrl('avatars', path);
}

export async function uploadTaskFile(
  supabase: SupabaseClient,
  taskId: number,
  file: File,
): Promise<{ id: string; name: string; filename: string; size: number; type: string; uploaded_at: string; uploaded_by: string; url: string }> {
  if (file.size > MAX_TASK_FILE) {
    throw new Error('El archivo es demasiado grande. Máximo 10MB');
  }

  const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
  const unique = `${file.name.replace(/\.[^.]+$/, '')}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const path = `${taskId}/${unique}`;

  const buf = new Uint8Array(await file.arrayBuffer());
  const { error } = await supabase.storage.from('task-files').upload(path, buf, {
    contentType: file.type || 'application/octet-stream',
    upsert: false,
  });
  if (error) throw new Error(error.message);

  const url = supabasePublicUrl('task-files', path);
  return {
    id: crypto.randomUUID().replace(/-/g, '').slice(0, 13),
    name: file.name,
    filename: unique,
    size: file.size,
    type: file.type || 'application/octet-stream',
    uploaded_at: new Date().toISOString(),
    uploaded_by: 'user',
    url,
  };
}

export async function uploadMilestoneEvidenceFiles(
  supabase: SupabaseClient,
  taskId: number,
  userId: number,
  fileList: File[],
): Promise<
  Array<{
    id: string;
    name: string;
    size: number;
    type: string;
    url: string;
    uploadedAt: string;
  }>
> {
  const out: Array<{
    id: string;
    name: string;
    size: number;
    type: string;
    url: string;
    uploadedAt: string;
  }> = [];

  for (const file of fileList) {
    if (file.size > MAX_EVIDENCE_FILE) {
      throw new Error(`"${file.name}" supera el máximo de 10MB`);
    }
    const mime = file.type || 'application/octet-stream';
    if (!ALLOWED_EVIDENCE.has(mime)) {
      throw new Error(`Tipo no permitido: ${file.name}`);
    }

    const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
    const unique = `${safeName}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const path = `${taskId}/${userId}/${unique}`;

    const buf = new Uint8Array(await file.arrayBuffer());
    const { error } = await supabase.storage.from('milestone-evidence').upload(path, buf, {
      contentType: mime,
      upsert: false,
    });
    if (error) throw new Error(error.message);

    out.push({
      id: crypto.randomUUID().replace(/-/g, '').slice(0, 13),
      name: file.name,
      size: file.size,
      type: mime,
      path,
      uploadedAt: new Date().toISOString(),
    });
  }

  return out;
}

export async function uploadDealEvidenceFiles(
  supabase: SupabaseClient,
  agreementId: string,
  userId: number,
  fileList: File[],
): Promise<
  Array<{
    id: string;
    name: string;
    size: number;
    type: string;
    path: string;
    uploadedAt: string;
  }>
> {
  const out: Array<{
    id: string;
    name: string;
    size: number;
    type: string;
    path: string;
    uploadedAt: string;
  }> = [];

  for (const file of fileList) {
    if (file.size > MAX_EVIDENCE_FILE) {
      throw new Error(`"${file.name}" supera el máximo de 10MB`);
    }
    const mime = file.type || 'application/octet-stream';
    if (!ALLOWED_EVIDENCE.has(mime)) {
      throw new Error(`Tipo no permitido: ${file.name}`);
    }

    const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
    const unique = `${safeName}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const path = `deals/${agreementId}/${userId}/${unique}`;

    const buf = new Uint8Array(await file.arrayBuffer());
    const { error } = await supabase.storage.from('milestone-evidence').upload(path, buf, {
      contentType: mime,
      upsert: false,
    });
    if (error) throw new Error(error.message);

    out.push({
      id: crypto.randomUUID().replace(/-/g, '').slice(0, 13),
      name: file.name,
      size: file.size,
      type: mime,
      path,
      uploadedAt: new Date().toISOString(),
    });
  }

  return out;
}

export function isValidHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}
