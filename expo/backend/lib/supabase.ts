const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export function isSupabaseConfigured(): boolean {
  return !!(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export async function supabaseInsert<T extends Record<string, unknown>>(
  table: string,
  data: T,
): Promise<{ id: string; persisted: boolean }> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.log(`[Supabase] Not configured — skipping insert into ${table}`);
    return { id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, persisted: false };
  }

  const url = `${SUPABASE_URL}/rest/v1/${table}`;
  console.log(`[Supabase] Inserting into ${table}:`, JSON.stringify(data).slice(0, 200));

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`[Supabase] Insert into ${table} failed (${response.status}):`, errorText);
      return { id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, persisted: false };
    }

    const rows = await response.json() as Array<{ id: string }>;
    const insertedId = rows?.[0]?.id ?? `supa-${Date.now()}`;
    console.log(`[Supabase] Inserted into ${table}, id:`, insertedId);
    return { id: String(insertedId), persisted: true };
  } catch (error) {
    console.log(`[Supabase] Network error inserting into ${table}:`, error);
    return { id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, persisted: false };
  }
}
