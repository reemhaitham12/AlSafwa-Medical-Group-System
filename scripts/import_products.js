import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

function getEnvConfig() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    throw new Error('.env file not found');
  }
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const parts = trimmed.split('=');
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      env[key] = val;
    }
  }
  return env;
}

const env = getEnvConfig();
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('your-project-id')) {
  console.error('Error: Invalid or placeholder Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const productsToImport = [
  // Clinical Chemistry Substrate Reagents
  { product_code: 'SU001-SP', name: 'ALBUMIN (2 x 50)', category: 'Clinical Chemistry Substrate Reagents', price: 325.00 },
  { product_code: 'SU005', name: 'BILIRUBIN TOTAL + DIRECT DMSO (2 x 125)', category: 'Clinical Chemistry Substrate Reagents', price: 540.00 },
  { product_code: 'SU005-SP', name: 'BILIRUBIN TOTAL + DIRECT DMSO (2 x 50)', category: 'Clinical Chemistry Substrate Reagents', price: 375.00 },
  { product_code: 'SU007-SP', name: 'CALCIUM ARSENAZO III (2 x 50)', category: 'Clinical Chemistry Substrate Reagents', price: 520.00 },
  { product_code: 'SU009-SP', name: 'CALCIUM OCC V/V (2 x 50)', category: 'Clinical Chemistry Substrate Reagents', price: 375.00 },
  { product_code: 'SU011', name: 'CHOLESTEROL LIQUID STABLE (2 x 50)', category: 'Clinical Chemistry Substrate Reagents', price: 520.00 },
  { product_code: 'SU014', name: 'HDL-CHOLESTEROL (Precipitating reagent only) (3 x 10)', category: 'Clinical Chemistry Substrate Reagents', price: 840.00 },
  { product_code: 'SU014LQ', name: 'HDL-CHOLESTEROL DIRECT (30+10+Cal)', category: 'Clinical Chemistry Substrate Reagents', price: 2100.00 },
  { product_code: 'SU015', name: 'CRETININE JAFFE (2 x 125)', category: 'Clinical Chemistry Substrate Reagents', price: 630.00 },
  { product_code: 'SU015-SP', name: 'CRETININE JAFFE (2 x 50)', category: 'Clinical Chemistry Substrate Reagents', price: 350.00 },
  { product_code: 'SU018', name: 'GLUCOSE LIQUID STABLE (2 x 125)', category: 'Clinical Chemistry Substrate Reagents', price: 485.00 },
  { product_code: 'SU019', name: 'GLUCOSE LIQUID STABLE (4 x 250)', category: 'Clinical Chemistry Substrate Reagents', price: 1200.00 },
  { product_code: 'SU027-SP', name: 'PHOSPHORUS UV (2 x 50)', category: 'Clinical Chemistry Substrate Reagents', price: 375.00 },
  { product_code: 'SU025', name: 'MAGNESIUM CALMAGITE (2 x 125)', category: 'Clinical Chemistry Substrate Reagents', price: 975.00 },
  { product_code: 'SU022SP', name: 'Iron (40+10)', category: 'Clinical Chemistry Substrate Reagents', price: 780.00 },
  { product_code: 'SU023', name: 'TIBC (50T)', category: 'Clinical Chemistry Substrate Reagents', price: 780.00 },
  { product_code: 'SU029SP', name: 'TOTAL PROTEIN (2 x 50)', category: 'Clinical Chemistry Substrate Reagents', price: 325.00 },
  { product_code: 'SU031', name: 'Proteins in Urine & CSF (2 x 125 + Cal)', category: 'Clinical Chemistry Substrate Reagents', price: 790.00 },
  { product_code: 'SU033', name: 'TRIGLYCERIDES LIQUID STABLE (2 x 50)', category: 'Clinical Chemistry Substrate Reagents', price: 980.00 },
  { product_code: 'SU037-SP', name: 'UREA UV LQ (40 + 10)', category: 'Clinical Chemistry Substrate Reagents', price: 430.00 },
  { product_code: 'SU038', name: 'UREA-B (2 x 125)', category: 'Clinical Chemistry Substrate Reagents', price: 1000.00 },
  { product_code: 'SU042', name: 'URIC ACID LIQUID STABLE (2 x 50)', category: 'Clinical Chemistry Substrate Reagents', price: 450.00 },

  // Clinical Chemistry Enzymes Reagents
  { product_code: 'EZ002LQ-SP', name: 'ALKALINE PHOSPHATASE /ALP LQ (40 + 10)', category: 'Clinical Chemistry Enzymes Reagents', price: 375.00 },
  { product_code: 'EZ001', name: 'Acid phosphetase (19x2 ml)', category: 'Clinical Chemistry Enzymes Reagents', price: 1150.00 },
  { product_code: 'EZ004-SP', name: 'AMYLASE LIQUID STABLE (5 x 10)', category: 'Clinical Chemistry Enzymes Reagents', price: 1550.00 },
  { product_code: 'EZ025', name: 'LIPASE LQ (4 x 10)', category: 'Clinical Chemistry Enzymes Reagents', price: 6500.00 },
  { product_code: 'EZ007', name: 'CK-NAC-LQ (20 + 5)', category: 'Clinical Chemistry Enzymes Reagents', price: 975.00 },
  { product_code: 'EZ008SP', name: 'CK-MB-LQ (20 + 5)', category: 'Clinical Chemistry Enzymes Reagents', price: 1800.00 },
  { product_code: 'EZ012LQ', name: 'GOT/AST LQ (100+ 25)', category: 'Clinical Chemistry Enzymes Reagents', price: 740.00 },
  { product_code: 'EZ012LQ-SP', name: 'GOT/AST LQ (40 + 10)', category: 'Clinical Chemistry Enzymes Reagents', price: 375.00 },
  { product_code: 'EZ016LQ', name: 'GPT/ALT LQ (100 + 25)', category: 'Clinical Chemistry Enzymes Reagents', price: 740.00 },
  { product_code: 'EZ016LQ-SP', name: 'GPT/ALT LQ (40 + 10)', category: 'Clinical Chemistry Enzymes Reagents', price: 375.00 },
  { product_code: 'EZ009-SP', name: 'GAMMA-GT LQ (40 + 10)', category: 'Clinical Chemistry Enzymes Reagents', price: 690.00 },
  { product_code: 'EZ021LQ-SP', name: 'LDH LQ (40 + 10)', category: 'Clinical Chemistry Enzymes Reagents', price: 375.00 },
  { product_code: 'SU002', name: 'NH3 (40 + 10)', category: 'Clinical Chemistry Enzymes Reagents', price: 1500.00 },

  // Control Cardiac
  { product_code: 'QC008', name: 'CK-MB CONTROL (1 x 3)', category: 'Control Cardiac', price: 1500.00 },
  { product_code: 'QC003', name: 'Control Human Normal (Vail 5 mL)', category: 'Control Cardiac', price: 830.00 },
  { product_code: 'QC004', name: 'Control Human Pathologica (Vail 5 mL)', category: 'Control Cardiac', price: 830.00 },

  // Immunochemistry Serology
  { product_code: 'SE003', name: 'ASO LATEX REAGENT (5ml)', category: 'Immunochemistry Serology', price: 425.00 },
  { product_code: 'SE007', name: 'CRP LATEX REAGENT (5ml)', category: 'Immunochemistry Serology', price: 425.00 },
  { product_code: 'SE011', name: 'RF LATEX REAGENT (5ml)', category: 'Immunochemistry Serology', price: 400.00 },
  { product_code: 'SE024', name: 'ROSE BENGAL (5ml + 1ml + 1ml)', category: 'Immunochemistry Serology', price: 1500.00 },

  // Infectious Immuno Bacteriology
  { product_code: 'SE028', name: 'S. Paratyhi AH (5 ml)', category: 'Infectious Immuno Bacteriology', price: 250.00 },
  { product_code: 'SE030', name: 'S. Paratyhi BH (5 ml)', category: 'Infectious Immuno Bacteriology', price: 250.00 },
  { product_code: 'SE033', name: 'S. Tyhi O (5 ml)', category: 'Infectious Immuno Bacteriology', price: 250.00 },
  { product_code: 'SE034', name: 'S. Tyhi H (5 ml)', category: 'Infectious Immuno Bacteriology', price: 250.00 },
  { product_code: 'SE035', name: 'Brucella Abortus (5 ml)', category: 'Infectious Immuno Bacteriology', price: 275.00 },
  { product_code: 'SE035-M', name: 'Brucella Mellitensis (5 ml)', category: 'Infectious Immuno Bacteriology', price: 275.00 },
  { product_code: 'SEWK4X5', name: 'Widal group Bacterial Antigens (4 x 5 ml)', category: 'Infectious Immuno Bacteriology', price: 900.00 },

  // Turbi Reagents
  { product_code: 'TL015', name: 'ASO TURBI. (10+40 + Cal)', category: 'Turbi Reagents', price: 1950.00 },
  { product_code: 'TL025', name: 'RF TURBI. (10+40 + Cal)', category: 'Turbi Reagents', price: 1800.00 },
  { product_code: 'TL035', name: 'CRP TURBI. (10+40+ Cal)', category: 'Turbi Reagents', price: 1800.00 },
  { product_code: 'TL090', name: 'MICROALBUMIN TURBI. (5+45+CAL)', category: 'Turbi Reagents', price: 3400.00 },

  // Special Immunology
  { product_code: 'IT090', name: 'C3 (40 +10)', category: 'Special Immunology', price: 2550.00 },
  { product_code: 'IT100', name: 'C4 (40 +10)', category: 'Special Immunology', price: 2550.00 },
  { product_code: 'IT120', name: 'IgA (40 +10)', category: 'Special Immunology', price: 2550.00 },
  { product_code: 'IT130', name: 'IgG (40 +10)', category: 'Special Immunology', price: 2550.00 },
  { product_code: 'IT140', name: 'IgM (40 +10)', category: 'Special Immunology', price: 2550.00 },
  { product_code: 'IT210', name: 'PROT CAL (1 x 2)', category: 'Special Immunology', price: 2950.00 },

  // Rayto Chemistry Reagents
  { product_code: 'R01012', name: 'PT (4 X 10)', category: 'Rayto Chemistry Reagents', price: 2100.00 },
  { product_code: 'R07912 LQ', name: 'PT (Liquid) (5 X 10)', category: 'Rayto Chemistry Reagents', price: 2250.00 },
  { product_code: 'R01112LQ', name: 'PTT (4 x 10)', category: 'Rayto Chemistry Reagents', price: 2600.00 }
];

async function runImport() {
  const args = process.argv.slice(2);
  const email = args[0];
  const password = args[1];

  if (email && password) {
    console.log(`Authenticating as ${email}...`);
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (authError) {
      console.error('Authentication Error:', authError.message);
      process.exit(1);
    }
    console.log('✅ Auth session established. Inserting products under RLS policy...');
  } else {
    console.log('No auth credentials provided to script. Attempting request...');
  }

  const { data, error } = await supabase
    .from('products')
    .upsert(productsToImport, { onConflict: 'product_code' })
    .select();

  if (error) {
    console.error('Supabase Import Error:', error.message);
    console.log('\n💡 TIP: To insert via API under RLS, run: node scripts/import_products.js <user-email> <password>');
    console.log('OR run the SQL file "supabase/seed_products.sql" directly in Supabase SQL Editor.');
    process.exit(1);
  }

  console.log(`\n========================================`);
  console.log(`✅ IMPORT SUCCESSFUL: ${data.length} products inserted into public.products`);
  console.log(`========================================\n`);

  // Verification 1: Check QC008
  const qc008 = data.find(p => p.product_code === 'QC008');
  if (qc008) {
    console.log(`VERIFICATION 1 [QC008]: ${qc008.name} | Code: ${qc008.product_code} | Price: ${qc008.price} EGP (MATCH)`);
  }

  // Verification 2: Check unpriced items
  const { data: unpricedCheck } = await supabase
    .from('products')
    .select('product_code')
    .in('product_code', ['TL012', 'TL022', 'IT200']);

  console.log(`VERIFICATION 2 [Unpriced Items]: ${unpricedCheck ? unpricedCheck.length : 0} found in database (EXPECTED 0)`);
}

runImport().catch(err => {
  console.error(err);
  process.exit(1);
});
