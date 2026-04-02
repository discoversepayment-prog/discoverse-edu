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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      ai_agents: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by: string | null
          greeting_message: string
          id: string
          image_gen_style: string | null
          is_maintenance: boolean | null
          is_published: boolean
          knowledge_areas: string[] | null
          language_style: string
          name: string
          personality: string
          research_papers: string[] | null
          slug: string
          system_prompt: string
          tools_enabled: Json | null
          updated_at: string
          voice_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          greeting_message?: string
          id?: string
          image_gen_style?: string | null
          is_maintenance?: boolean | null
          is_published?: boolean
          knowledge_areas?: string[] | null
          language_style?: string
          name: string
          personality?: string
          research_papers?: string[] | null
          slug: string
          system_prompt: string
          tools_enabled?: Json | null
          updated_at?: string
          voice_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          greeting_message?: string
          id?: string
          image_gen_style?: string | null
          is_maintenance?: boolean | null
          is_published?: boolean
          knowledge_areas?: string[] | null
          language_style?: string
          name?: string
          personality?: string
          research_papers?: string[] | null
          slug?: string
          system_prompt?: string
          tools_enabled?: Json | null
          updated_at?: string
          voice_id?: string | null
        }
        Relationships: []
      }
      contact_inquiries: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string | null
          name: string
          type: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message?: string | null
          name: string
          type?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          name?: string
          type?: string
        }
        Relationships: []
      }
      conversation_history: {
        Row: {
          agent_id: string
          created_at: string
          id: string
          messages: Json
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          id?: string
          messages?: Json
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          id?: string
          messages?: Json
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_history_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      models: {
        Row: {
          class_levels: number[] | null
          created_at: string
          file_format: string
          file_size_bytes: number | null
          file_url: string
          id: string
          keywords_en: string[] | null
          keywords_hi: string[] | null
          keywords_ne: string[] | null
          license: string | null
          name: string
          named_parts: string[] | null
          ncert_chapters: string[] | null
          quality_rating: number | null
          slug: string
          source: string | null
          status: string
          subject: string
          tier: number
          updated_at: string
          uploaded_by: string | null
          viral_score: number | null
        }
        Insert: {
          class_levels?: number[] | null
          created_at?: string
          file_format?: string
          file_size_bytes?: number | null
          file_url: string
          id?: string
          keywords_en?: string[] | null
          keywords_hi?: string[] | null
          keywords_ne?: string[] | null
          license?: string | null
          name: string
          named_parts?: string[] | null
          ncert_chapters?: string[] | null
          quality_rating?: number | null
          slug: string
          source?: string | null
          status?: string
          subject?: string
          tier?: number
          updated_at?: string
          uploaded_by?: string | null
          viral_score?: number | null
        }
        Update: {
          class_levels?: number[] | null
          created_at?: string
          file_format?: string
          file_size_bytes?: number | null
          file_url?: string
          id?: string
          keywords_en?: string[] | null
          keywords_hi?: string[] | null
          keywords_ne?: string[] | null
          license?: string | null
          name?: string
          named_parts?: string[] | null
          ncert_chapters?: string[] | null
          quality_rating?: number | null
          slug?: string
          source?: string | null
          status?: string
          subject?: string
          tier?: number
          updated_at?: string
          uploaded_by?: string | null
          viral_score?: number | null
        }
        Relationships: []
      }
      otp_codes: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          otp: string
          phone: string
          verified: boolean | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string
          id?: string
          otp: string
          phone: string
          verified?: boolean | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          otp?: string
          phone?: string
          verified?: boolean | null
        }
        Relationships: []
      }
      payment_requests: {
        Row: {
          admin_note: string | null
          amount: number
          created_at: string
          currency: string
          id: string
          payment_method: string
          reviewed_by: string | null
          screenshot_url: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          payment_method?: string
          reviewed_by?: string | null
          screenshot_url?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          payment_method?: string
          reviewed_by?: string | null
          screenshot_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          can_create_agent: boolean | null
          created_at: string
          display_name: string | null
          id: string
          role_default: string | null
          share_url: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          can_create_agent?: boolean | null
          created_at?: string
          display_name?: string | null
          id?: string
          role_default?: string | null
          share_url?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          can_create_agent?: boolean | null
          created_at?: string
          display_name?: string | null
          id?: string
          role_default?: string | null
          share_url?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      simulation_cache: {
        Row: {
          ai_response: Json
          created_at: string
          id: string
          language: string
          model_id: string
          serve_count: number | null
          updated_at: string
        }
        Insert: {
          ai_response: Json
          created_at?: string
          id?: string
          language?: string
          model_id: string
          serve_count?: number | null
          updated_at?: string
        }
        Update: {
          ai_response?: Json
          created_at?: string
          id?: string
          language?: string
          model_id?: string
          serve_count?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulation_cache_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          expires_at: string | null
          generation_reset_at: string
          generations_used: number
          id: string
          monthly_generations: number
          plan: string
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          generation_reset_at?: string
          generations_used?: number
          id?: string
          monthly_generations?: number
          plan?: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          generation_reset_at?: string
          generations_used?: number
          id?: string
          monthly_generations?: number
          plan?: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      usage_analytics: {
        Row: {
          country: string | null
          created_at: string
          id: string
          language: string | null
          last_step_viewed: number | null
          model_id: string | null
          query_text: string | null
          session_duration_ms: number | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          id?: string
          language?: string | null
          last_step_viewed?: number | null
          model_id?: string | null
          query_text?: string | null
          session_duration_ms?: number | null
        }
        Update: {
          country?: string | null
          created_at?: string
          id?: string
          language?: string | null
          last_step_viewed?: number | null
          model_id?: string | null
          query_text?: string | null
          session_duration_ms?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_analytics_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      user_library: {
        Row: {
          created_at: string
          id: string
          last_step: number | null
          model_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_step?: number | null
          model_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_step?: number | null
          model_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_library_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      store_otp: { Args: { _otp: string; _phone: string }; Returns: undefined }
      verify_otp: { Args: { _otp: string; _phone: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "student"
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
      app_role: ["admin", "student"],
    },
  },
} as const
