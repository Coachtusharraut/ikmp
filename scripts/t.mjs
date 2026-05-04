import { createClient } from '@supabase/supabase-js';
const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
let page=1, all=[];
while(true){
  const {data,error}=await s.auth.admin.listUsers({page,perPage:200});
  if(error){console.error(error);break;}
  all.push(...data.users);
  if(data.users.length<200)break; page++;
}
console.log('total:', all.length);
all.forEach(u=>console.log(u.id, '|', u.email, '|', u.user_metadata?.email));
