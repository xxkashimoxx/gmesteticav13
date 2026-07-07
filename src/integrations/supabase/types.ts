export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_integrations: {
        Row: {
          category: string
          config: Json
          created_at: string
          description: string | null
          enabled: boolean
          id: string
          last_error: string | null
          last_sync_at: string | null
          name: string
          provider: string
          status: string
          updated_at: string
        }
        Insert: {
          category: string
          config?: Json
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          name: string
          provider: string
          status?: string
          updated_at?: string
        }
        Update: {
          category?: string
          config?: Json
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          name?: string
          provider?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          confirmation_sent_at: string | null
          confirmation_status: string
          created_at: string
          id: string
          lead_id: string | null
          notes: string | null
          patient_name: string
          patient_phone: string | null
          previous_scheduled_at: string | null
          procedure_id: string | null
          procedure_name: string | null
          reminder_24h_sent_at: string | null
          reminder_2h_sent_at: string | null
          reminder_sent_at: string | null
          reschedule_notice_sent_at: string | null
          scheduled_at: string
          status: string
          updated_at: string
          value: number
        }
        Insert: {
          confirmation_sent_at?: string | null
          confirmation_status?: string
          created_at?: string
          id?: string
          lead_id?: string | null
          notes?: string | null
          patient_name: string
          patient_phone?: string | null
          previous_scheduled_at?: string | null
          procedure_id?: string | null
          procedure_name?: string | null
          reminder_24h_sent_at?: string | null
          reminder_2h_sent_at?: string | null
          reminder_sent_at?: string | null
          reschedule_notice_sent_at?: string | null
          scheduled_at: string
          status?: string
          updated_at?: string
          value?: number
        }
        Update: {
          confirmation_sent_at?: string | null
          confirmation_status?: string
          created_at?: string
          id?: string
          lead_id?: string | null
          notes?: string | null
          patient_name?: string
          patient_phone?: string | null
          previous_scheduled_at?: string | null
          procedure_id?: string | null
          procedure_name?: string | null
          reminder_24h_sent_at?: string | null
          reminder_2h_sent_at?: string | null
          reminder_sent_at?: string | null
          reschedule_notice_sent_at?: string | null
          scheduled_at?: string
          status?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "appointments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "procedures"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_interactions: {
        Row: {
          channel: string
          created_at: string
          created_by: string | null
          direction: string
          id: string
          lead_id: string
          message: string
        }
        Insert: {
          channel?: string
          created_at?: string
          created_by?: string | null
          direction?: string
          id?: string
          lead_id: string
          message: string
        }
        Update: {
          channel?: string
          created_at?: string
          created_by?: string | null
          direction?: string
          id?: string
          lead_id?: string
          message?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_interactions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          campaign: string | null
          created_at: string
          email: string | null
          estimated_value: number
          id: string
          last_contact_at: string | null
          name: string
          notes: string | null
          phone: string | null
          procedure_id: string | null
          procedure_interest: string | null
          score: number
          source: string
          stage: string
          temperature: string
          updated_at: string
        }
        Insert: {
          campaign?: string | null
          created_at?: string
          email?: string | null
          estimated_value?: number
          id?: string
          last_contact_at?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          procedure_id?: string | null
          procedure_interest?: string | null
          score?: number
          source?: string
          stage?: string
          temperature?: string
          updated_at?: string
        }
        Update: {
          campaign?: string | null
          created_at?: string
          email?: string | null
          estimated_value?: number
          id?: string
          last_contact_at?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          procedure_id?: string | null
          procedure_interest?: string | null
          score?: number
          source?: string
          stage?: string
          temperature?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "procedures"
            referencedColumns: ["id"]
          },
        ]
      }
      procedure_sales: {
        Row: {
          created_at: string
          id: string
          lead_id: string | null
          patient_name: string
          procedure_id: string | null
          procedure_name: string
          sold_at: string
          source: string | null
          value: number
        }
        Insert: {
          created_at?: string
          id?: string
          lead_id?: string | null
          patient_name: string
          procedure_id?: string | null
          procedure_name: string
          sold_at?: string
          source?: string | null
          value?: number
        }
        Update: {
          created_at?: string
          id?: string
          lead_id?: string | null
          patient_name?: string
          procedure_id?: string | null
          procedure_name?: string
          sold_at?: string
          source?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "procedure_sales_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procedure_sales_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "procedures"
            referencedColumns: ["id"]
          },
        ]
      }
      procedures: {
        Row: {
          archived: boolean
          category: string
          created_at: string
          default_price: number
          description: string | null
          duration: string | null
          highlight: string | null
          id: string
          name: string
          sessions_recommended: number
          updated_at: string
        }
        Insert: {
          archived?: boolean
          category: string
          created_at?: string
          default_price?: number
          description?: string | null
          duration?: string | null
          highlight?: string | null
          id?: string
          name: string
          sessions_recommended?: number
          updated_at?: string
        }
        Update: {
          archived?: boolean
          category?: string
          created_at?: string
          default_price?: number
          description?: string | null
          duration?: string | null
          highlight?: string | null
          id?: string
          name?: string
          sessions_recommended?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "traffic_manager" | "staff"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "traffic_manager", "staff"],
    },
  },
} as const
