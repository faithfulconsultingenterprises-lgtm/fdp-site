import { createClient } from "@supabase/supabase-js";

/*
  Supabase connection for the Find Dental Providers website.

  SUPABASE_ANON_KEY is the PUBLIC "anon" / publishable key. It is safe to ship in
  browser code — it can only do what Row Level Security allows (here: insert a lead
  into `insurance_leads`). NEVER put the secret `service_role` key in this file.
*/
const SUPABASE_URL = "https://sucqnazhditlrrqdbmmq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1Y3FuYXpoZGl0bHJycWRibW1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMTY1MTUsImV4cCI6MjA5NDY5MjUxNX0.-prAjNEV8kxltF_9i-4JBNcpYe74ez9gyaQzwh8GLhg";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
