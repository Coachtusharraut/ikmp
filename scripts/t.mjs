import { createClient } from '@supabase/supabase-js';
const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data, error } = await s.auth.admin.listUsers({ page: 1, perPage: 5 });
console.log('error:', error);
console.log('count:', data?.users?.length);
console.log('sample:', JSON.stringify(data?.users?.[0], null, 2).slice(0,1200));
