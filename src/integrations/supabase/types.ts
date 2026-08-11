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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      blocks: {
        Row: {
          blocked_id: string
          created_at: string
          id: string
          owner_id: string
        }
        Insert: {
          blocked_id: string
          created_at?: string
          id?: string
          owner_id: string
        }
        Update: {
          blocked_id?: string
          created_at?: string
          id?: string
          owner_id?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          owner_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          owner_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          owner_id?: string
        }
        Relationships: []
      }
      email_otps: {
        Row: {
          attempts: number
          code_hash: string
          consumed_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          purpose: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          purpose?: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          purpose?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          created_at: string
          deleted_by_recipient: boolean
          deleted_by_sender: boolean
          deleted_for_all: boolean
          delivered_at: string | null
          edited_at: string | null
          id: string
          kind: string
          media_url: string | null
          read_at: string | null
          recipient_id: string
          reply_to: string | null
          sender_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          deleted_by_recipient?: boolean
          deleted_by_sender?: boolean
          deleted_for_all?: boolean
          delivered_at?: string | null
          edited_at?: string | null
          id?: string
          kind?: string
          media_url?: string | null
          read_at?: string | null
          recipient_id: string
          reply_to?: string | null
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          deleted_by_recipient?: boolean
          deleted_by_sender?: boolean
          deleted_for_all?: boolean
          delivered_at?: string | null
          edited_at?: string | null
          id?: string
          kind?: string
          media_url?: string | null
          read_at?: string | null
          recipient_id?: string
          reply_to?: string | null
          sender_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          about: string
          avatar_url: string | null
          ban_reason: string | null
          banned: boolean
          cover_url: string | null
          created_at: string
          display_name: string | null
          email_verified: boolean
          id: string
          last_seen: string
          peer_id: string | null
          status: string
          updated_at: string
          username: string | null
          verified: boolean
        }
        Insert: {
          about?: string
          avatar_url?: string | null
          ban_reason?: string | null
          banned?: boolean
          cover_url?: string | null
          created_at?: string
          display_name?: string | null
          email_verified?: boolean
          id: string
          last_seen?: string
          peer_id?: string | null
          status?: string
          updated_at?: string
          username?: string | null
          verified?: boolean
        }
        Update: {
          about?: string
          avatar_url?: string | null
          ban_reason?: string | null
          banned?: boolean
          cover_url?: string | null
          created_at?: string
          display_name?: string | null
          email_verified?: boolean
          id?: string
          last_seen?: string
          peer_id?: string | null
          status?: string
          updated_at?: string
          username?: string | null
          verified?: boolean
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          action_taken: string
          ai_summary: string | null
          created_at: string
          id: string
          reason: string
          reported_id: string
          reporter_id: string
          transcript: Json
          verdict: string
        }
        Insert: {
          action_taken?: string
          ai_summary?: string | null
          created_at?: string
          id?: string
          reason?: string
          reported_id: string
          reporter_id: string
          transcript?: Json
          verdict?: string
        }
        Update: {
          action_taken?: string
          ai_summary?: string | null
          created_at?: string
          id?: string
          reason?: string
          reported_id?: string
          reporter_id?: string
          transcript?: Json
          verdict?: string
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
    Enums: {},
  },
} as const
