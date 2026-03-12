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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      article_drafts: {
        Row: {
          created_at: string
          english_content: string
          english_keywords: string[] | null
          english_meta_description: string | null
          english_title: string
          hebrew_content: string
          hebrew_keywords: string[] | null
          hebrew_meta_description: string | null
          hebrew_title: string
          id: string
          source_image: string | null
          source_name: string | null
          source_title: string
          source_url: string
          status: string
          unsplash_photo_url: string | null
          updated_at: string
          user_id: string
          wordpress_english_id: string | null
          wordpress_english_url: string | null
          wordpress_hebrew_id: string | null
          wordpress_hebrew_url: string | null
        }
        Insert: {
          created_at?: string
          english_content: string
          english_keywords?: string[] | null
          english_meta_description?: string | null
          english_title: string
          hebrew_content: string
          hebrew_keywords?: string[] | null
          hebrew_meta_description?: string | null
          hebrew_title: string
          id?: string
          source_image?: string | null
          source_name?: string | null
          source_title: string
          source_url: string
          status?: string
          unsplash_photo_url?: string | null
          updated_at?: string
          user_id: string
          wordpress_english_id?: string | null
          wordpress_english_url?: string | null
          wordpress_hebrew_id?: string | null
          wordpress_hebrew_url?: string | null
        }
        Update: {
          created_at?: string
          english_content?: string
          english_keywords?: string[] | null
          english_meta_description?: string | null
          english_title?: string
          hebrew_content?: string
          hebrew_keywords?: string[] | null
          hebrew_meta_description?: string | null
          hebrew_title?: string
          id?: string
          source_image?: string | null
          source_name?: string | null
          source_title?: string
          source_url?: string
          status?: string
          unsplash_photo_url?: string | null
          updated_at?: string
          user_id?: string
          wordpress_english_id?: string | null
          wordpress_english_url?: string | null
          wordpress_hebrew_id?: string | null
          wordpress_hebrew_url?: string | null
        }
        Relationships: []
      }
      chatbot_rate_limits: {
        Row: {
          id: string
          ip_hash: string
          request_count: number
          window_start: string
        }
        Insert: {
          id?: string
          ip_hash: string
          request_count?: number
          window_start?: string
        }
        Update: {
          id?: string
          ip_hash?: string
          request_count?: number
          window_start?: string
        }
        Relationships: []
      }
      email_recipients: {
        Row: {
          created_at: string
          email: string
          id: string
          is_active: boolean
          name: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          name?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          name?: string | null
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          interests: string[] | null
          ip_hash: string | null
          language: string | null
          name: string | null
          session_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          interests?: string[] | null
          ip_hash?: string | null
          language?: string | null
          name?: string | null
          session_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          interests?: string[] | null
          ip_hash?: string | null
          language?: string | null
          name?: string | null
          session_id?: string | null
        }
        Relationships: []
      }
      sent_articles: {
        Row: {
          article_title: string
          article_url: string
          email_sent_to: string | null
          id: string
          image_url: string | null
          keyword_used: string | null
          sent_at: string
        }
        Insert: {
          article_title: string
          article_url: string
          email_sent_to?: string | null
          id?: string
          image_url?: string | null
          keyword_used?: string | null
          sent_at?: string
        }
        Update: {
          article_title?: string
          article_url?: string
          email_sent_to?: string | null
          id?: string
          image_url?: string | null
          keyword_used?: string | null
          sent_at?: string
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
      workspace_users: {
        Row: {
          id: string
          workspace_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          user_id?: string
          created_at?: string
        }
        Relationships: []
      }
      workspace_settings: {
        Row: {
          workspace_id: string
          brand_name: string
          brand_tagline: string
          brand_logo_url: string | null
          industry_vertical: string
          wordpress_url: string
          wordpress_username: string
          wordpress_app_password: string
          scan_keywords: string[]
          default_search_query: string | null
          excluded_keywords: string[]
          excluded_domains: string[]
          priority_sources: string[]
          trusted_domains: string[]
          rss_feeds: Json
          keywords: Json
          default_categories: string[]
          category_blacklist: string[]
          category_map: Json
          always_include_category: string | null
          system_prompt: string
          chatbot_system_prompt: string | null
          chatbot_topics: Json
          chatbot_allowed_origins: string[]
          chatbot_greeting: Json
          email_sender_name: string
          email_from_address: string | null
          dashboard_url: string | null
          fallback_images: string[]
          default_image_query: string
          supported_languages: string[]
          primary_language: string
          bilingual_mode: boolean
          theme_colors: Json
          updated_at: string | null
        }
        Insert: {
          workspace_id: string
          brand_name?: string
          brand_tagline?: string
          brand_logo_url?: string | null
          industry_vertical?: string
          wordpress_url?: string
          wordpress_username?: string
          wordpress_app_password?: string
          scan_keywords?: string[]
          default_search_query?: string | null
          excluded_keywords?: string[]
          excluded_domains?: string[]
          priority_sources?: string[]
          trusted_domains?: string[]
          rss_feeds?: Json
          keywords?: Json
          default_categories?: string[]
          category_blacklist?: string[]
          category_map?: Json
          always_include_category?: string | null
          system_prompt?: string
          chatbot_system_prompt?: string | null
          chatbot_topics?: Json
          chatbot_allowed_origins?: string[]
          chatbot_greeting?: Json
          email_sender_name?: string
          email_from_address?: string | null
          dashboard_url?: string | null
          fallback_images?: string[]
          default_image_query?: string
          supported_languages?: string[]
          primary_language?: string
          bilingual_mode?: boolean
          theme_colors?: Json
          updated_at?: string | null
        }
        Update: {
          workspace_id?: string
          brand_name?: string
          brand_tagline?: string
          brand_logo_url?: string | null
          industry_vertical?: string
          wordpress_url?: string
          wordpress_username?: string
          wordpress_app_password?: string
          scan_keywords?: string[]
          default_search_query?: string | null
          excluded_keywords?: string[]
          excluded_domains?: string[]
          priority_sources?: string[]
          trusted_domains?: string[]
          rss_feeds?: Json
          keywords?: Json
          default_categories?: string[]
          category_blacklist?: string[]
          category_map?: Json
          always_include_category?: string | null
          system_prompt?: string
          chatbot_system_prompt?: string | null
          chatbot_topics?: Json
          chatbot_allowed_origins?: string[]
          chatbot_greeting?: Json
          email_sender_name?: string
          email_from_address?: string | null
          dashboard_url?: string | null
          fallback_images?: string[]
          default_image_query?: string
          supported_languages?: string[]
          primary_language?: string
          bilingual_mode?: boolean
          theme_colors?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_workspace_by_origin: {
        Args: {
          origin_url: string
        }
        Returns: string | null
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
