import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl!, supabaseAnonKey!);

async function discover() {
  const commonBuckets = ['products', 'productos', 'catalog', 'inventory', 'cards', 'images', 'photos', 'product_photos', 'gallery', 'sasori', 'sasorilabs'];
  for (const bName of commonBuckets) {
    console.log(`Checking bucket: ${bName}...`);
    const { data: files, error: fError } = await supabase.storage.from(bName).list('', { limit: 10 });
    if (fError) {
      console.log(`  Bucket ${bName} error: ${fError.message}`);
    } else if (files && files.length > 0) {
      console.log(`  SUCCESS! Bucket ${bName} has ${files.length} files.`);
      files.forEach(f => console.log(`    - ${f.name}`));
    } else {
      console.log(`  Bucket ${bName} found but empty or unauthorized.`);
    }
  }
}

discover();
