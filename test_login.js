import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://rhinfbtehnidrszkrhkv.supabase.co',
  'sb_publishable_mH55CI8MRIxRGTSkZCEFMw_UtTSBdSX'
);

async function test() {
  console.log("Logging in...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin1@acme.com',
    password: 'Demo1234!'
  });

  if (authError) {
    console.error("Auth Error Object:", JSON.stringify(authError, null, 2));
    return;
  }

  console.log("Logged in! User ID:", authData.user.id);

  console.log("Fetching profile...");
  const { data: profileData, error: profileError } = await supabase
    .from('users')
    .select('*, organizations(name)')
    .eq('id', authData.user.id)
    .single();

  if (profileError) {
    console.error("Profile Error:", profileError.message);
  } else {
    console.log("Profile:", profileData);
  }
}

test();
