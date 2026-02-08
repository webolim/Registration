import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { RegistrationData } from "../types";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../constants";

// Define Database types for Supabase
// Expanded to match Supabase generic expectations for correct type inference
export interface Database {
  public: {
    Tables: {
      registrations: {
        Row: {
          mobile: string
          data: any
          created_at: string
          updated_at: string
        }
        Insert: {
          mobile: string
          data: any
          updated_at?: string
          created_at?: string
        }
        Update: {
          mobile?: string
          data?: any
          updated_at?: string
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

let supabaseInstance: SupabaseClient<Database> | null = null;

const getSupabase = () => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Supabase credentials missing in constants.ts");
  }
  if (!supabaseInstance) {
    supabaseInstance = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return supabaseInstance;
};

// --- API Methods ---

export const api = {
  /**
   * Fetch a registration by mobile number
   */
  getByMobile: async (mobile: string): Promise<RegistrationData | null> => {
    const supabase = getSupabase();
    const cleanMobile = mobile.replace(/\D/g, '');
    
    // We assume the table is named 'registrations' with a 'data' JSONB column
    const { data, error } = await supabase
      .from('registrations')
      .select('data')
      .eq('mobile', cleanMobile)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      console.error("Supabase Error:", error);
      throw error;
    }
    
    // Return data.data safely
    return data ? data.data : null;
  },

  /**
   * Save (Upsert) a registration
   */
  save: async (regData: RegistrationData): Promise<void> => {
    const supabase = getSupabase();
    const cleanMobile = regData.primaryParticipant.mobile.replace(/\D/g, '');

    const { error } = await supabase
      .from('registrations')
      .upsert({
        mobile: cleanMobile,
        data: regData,
        updated_at: new Date().toISOString()
      }, { onConflict: 'mobile' });

    if (error) {
      console.error("Supabase Save Error:", error);
      throw error;
    }
  },

  /**
   * Get all registrations (for admin/export)
   */
  getAll: async (): Promise<RegistrationData[]> => {
    const supabase = getSupabase();
    
    const { data, error } = await supabase
      .from('registrations')
      .select('data')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data?.map((row) => row.data) || [];
  },

  /**
   * Delete a registration (Admin only)
   */
  delete: async (mobile: string): Promise<void> => {
    const supabase = getSupabase();
    const cleanMobile = mobile.replace(/\D/g, '');
    
    const { error } = await supabase
      .from('registrations')
      .delete()
      .eq('mobile', cleanMobile);

    if (error) {
      console.error("Supabase Delete Error:", error);
      throw error;
    }
  }
};