import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl!, supabaseAnonKey!);

async function discover() {
  const commonTables = ['products', 'inventory', 'cards', 'catalog', 'items'];
  for (const table of commonTables) {
    console.log(`Checking table: ${table}...`);
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.log(`Table ${table} error:`, error.message);
    } else {
      console.log(`Table ${table} found with data:`, JSON.stringify(data, null, 2));
    }
  }
}

discover();
