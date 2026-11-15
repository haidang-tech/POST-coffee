import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
process.loadEnvFile('.env.local');
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
for (const slug of ['tao', 'thom', 'ca-rot', 'oi']) {
  const path = `menu/nuoc-ep-${slug}.webp`;
  const body = readFileSync(`public/images/menu/nuoc-ep-${slug}.webp`);
  const { error } = await client.storage.from('menu-images').upload(path, body, { contentType: 'image/webp', cacheControl: '3600', upsert: true });
  if (error) throw error;
  const { data } = client.storage.from('menu-images').getPublicUrl(path);
  const response = await fetch(data.publicUrl);
  if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) throw new Error(`Image unavailable: ${slug}`);
  console.log(`OK ${slug}: ${response.status}`);
}
