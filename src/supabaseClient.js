import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vqevczwmygfjlmfsrfjc.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxZXZjendteWdmamxtZnNyZmpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3NjU3MTksImV4cCI6MjA4MjM0MTcxOX0.7JKsByLh_vIslPI2IxiV2WCBcYzwGNRedECtgMp38Gc'
export const supabase = createClient(supabaseUrl, supabaseKey)