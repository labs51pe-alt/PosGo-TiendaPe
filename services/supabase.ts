
import { createClient } from '@supabase/supabase-js';

// CREDENCIALES DE SUPABASE
const SUPABASE_URL = 'https://aeideybonufqzpzmuhmt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFlaWRleWJvbnVmcXpwem11aG10Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMzgyNDMsImV4cCI6MjA4MDgxNDI0M30.ez_ZlF0RZua3gyo6TU1nO3rdznbYyuQIWtQjrmHhliU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
