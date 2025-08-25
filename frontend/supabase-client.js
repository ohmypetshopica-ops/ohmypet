import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabaseUrl = 'https://pzpjpjfpulkrfcdviyte.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6cGpwamZwdWxrcmZjZHZpeXRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNTcyOTUsImV4cCI6MjA3MDkzMzI5NX0.nFyEqoWNgySC5g6INbwi2rPDVNda48xgygWJVmPIn60';

export const supabase = createClient(supabaseUrl, supabaseKey);
window.supabase = supabase;
