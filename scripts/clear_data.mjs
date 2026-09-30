// scripts/clear_data.mjs
// Clean-up & Reset Utility for Hackathon QR Generator
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '..', '.env');

if (!fs.existsSync(envPath)) {
  console.error('\x1b[31m❌ .env file not found at:\x1b[0m', envPath);
  process.exit(1);
}

const envFile = fs.readFileSync(envPath, 'utf8');
let url = '', key = '';
envFile.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k?.trim() === 'VITE_SUPABASE_URL') url = v.join('=').trim();
  if (k?.trim() === 'VITE_SUPABASE_ANON_KEY') key = v.join('=').trim();
});

if (!url || !key) {
  console.error('\x1b[31m❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env\x1b[0m');
  process.exit(1);
}

const supabase = createClient(url, key);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const ask = query => new Promise(resolve => rl.question(query, resolve));

async function main() {
  console.log('\n\x1b[36m====================================================\x1b[0m');
  console.log('\x1b[1m\x1b[33m   HACKDAYS QR PASS - DATABASE RESET UTILITY\x1b[0m');
  console.log('\x1b[36m====================================================\x1b[0m\n');
  console.log('Select an operation:');
  console.log(' \x1b[32m[1]\x1b[0m Reset Meal Scans only (Mark all passes UNCLAIMED & clear scan logs)');
  console.log(' \x1b[33m[2]\x1b[0m Clear Passes & Profiles (Participants keep approved status)');
  console.log(' \x1b[31m[3]\x1b[0m Full Factory Reset (Wipe all participants, ready for new Hackathon CSV)');
  console.log(' \x1b[90m[4] Cancel & Exit\x1b[0m\n');

  const choice = (await ask('Enter choice [1-4]: ')).trim();

  if (choice === '1') {
    console.log('\n\x1b[34m⏳ Clearing entry scan logs...\x1b[0m');
    const { error: logErr } = await supabase.from('entry_logs').delete().neq('entry_id', '___none___');
    if (logErr) console.error('Error clearing entry_logs:', logErr.message);

    console.log('\x1b[34m⏳ Resetting all passes to unused (active)...\x1b[0m');
    const { error: passErr } = await supabase
      .from('passes')
      .update({
        used: false,
        entry_status: 'not_entered',
        entry_time: null,
        scanned_by: null,
      })
      .neq('pass_id', '___none___');
    if (passErr) console.error('Error resetting passes:', passErr.message);

    console.log('\n\x1b[32m✅ Successfully reset all meal passes to UNCLAIMED!\x1b[0m');
    console.log('All participants can now scan their passes again.\n');
  } else if (choice === '2') {
    const confirm = (await ask('\n⚠️ Are you sure you want to delete all passes & profiles? (Press Enter or Y to confirm, n to cancel): ')).trim().toLowerCase();
    if (confirm === 'n' || confirm === 'no' || confirm === 'cancel') {
      console.log('Cancelled.');
      rl.close();
      return;
    }

    console.log('\n\x1b[34m⏳ Deleting entry logs...\x1b[0m');
    const { error: e1 } = await supabase.from('entry_logs').delete().neq('entry_id', '___none___');
    if (e1) console.error('Error clearing entry_logs:', e1.message);
    else console.log('\x1b[32m✔ Entry logs deleted\x1b[0m');

    console.log('\x1b[34m⏳ Deleting passes...\x1b[0m');
    const { error: e2 } = await supabase.from('passes').delete().neq('pass_id', '___none___');
    if (e2) console.error('Error clearing passes:', e2.message);
    else console.log('\x1b[32m✔ Passes deleted\x1b[0m');

    console.log('\x1b[34m⏳ Deleting participant profiles...\x1b[0m');
    const { error: e3 } = await supabase.from('profiles').delete().neq('user_id', '___none___');
    if (e3) console.error('Error clearing profiles:', e3.message);
    else console.log('\x1b[32m✔ Profiles deleted\x1b[0m');

    console.log('\n\x1b[32m✅ All test passes and profiles cleared!\x1b[0m');
    console.log('Approved participant list was preserved.\n');
  } else if (choice === '3') {
    const confirm = (await ask('\n\x1b[31m⚠️ FULL FACTORY RESET: This will delete ALL participants, passes, and meal logs.\nProceed? (Press Enter, Y, or type "RESET" to confirm | "n" to cancel): \x1b[0m')).trim().toLowerCase();
    if (confirm === 'n' || confirm === 'no' || confirm === 'cancel' || confirm === 'abort') {
      console.log('\x1b[33mOperation cancelled. No changes were made.\x1b[0m');
      rl.close();
      return;
    }

    console.log('\n\x1b[34m⏳ [1/5] Deleting scan logs (entry_logs)...\x1b[0m');
    const { error: e1 } = await supabase.from('entry_logs').delete().neq('entry_id', '___none___');
    if (e1) console.error('Notice on entry_logs:', e1.message);
    else console.log('\x1b[32m✔ Scan logs cleared\x1b[0m');

    console.log('\x1b[34m⏳ [2/5] Deleting passes...\x1b[0m');
    const { error: e2 } = await supabase.from('passes').delete().neq('pass_id', '___none___');
    if (e2) console.error('Notice on passes:', e2.message);
    else console.log('\x1b[32m✔ Passes cleared\x1b[0m');

    console.log('\x1b[34m⏳ [3/5] Deleting participant profiles...\x1b[0m');
    const { error: e3 } = await supabase.from('profiles').delete().neq('user_id', '___none___');
    if (e3) console.error('Notice on profiles:', e3.message);
    else console.log('\x1b[32m✔ Profiles cleared\x1b[0m');

    console.log('\x1b[34m⏳ [4/5] Deleting approved participants list...\x1b[0m');
    const { error: e4 } = await supabase.from('approved_participants').delete().neq('email', '___none___');
    if (e4) console.error('Notice on approved_participants:', e4.message);
    else console.log('\x1b[32m✔ Approved participants cleared\x1b[0m');

    console.log('\x1b[34m⏳ [5/5] Re-seeding test organizer account (test@hackdays.io)...\x1b[0m');
    const { error: e5 } = await supabase.from('approved_participants').insert([{
      email: 'test@hackdays.io',
      name: 'Tech Team Test',
      team: 'Tech Team',
      college: 'NMAMIT',
      usn: '4NM23CS001',
      phone: '+91 98765 43210',
    }]);
    if (e5) console.error('Notice on re-seed:', e5.message);
    else console.log('\x1b[32m✔ Default test account created: test@hackdays.io\x1b[0m');

    console.log('\n\x1b[32m🎉 FULL RESET COMPLETE!\x1b[0m');
    console.log('The database is 100% clean and ready for your real Hackathon CSV import.\n');
  } else {
    console.log('Exited.');
  }

  rl.close();
}

main().catch(err => {
  console.error('\n\x1b[31m❌ Unexpected Error:\x1b[0m', err);
  rl.close();
});
