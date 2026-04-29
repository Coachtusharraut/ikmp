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
      course_enrollments: {
        Row: {
          amount_paid: number
          course_id: string
          enrolled_at: string
          id: string
          payment_status: string
          user_id: string
        }
        Insert: {
          amount_paid?: number
          course_id: string
          enrolled_at?: string
          id?: string
          payment_status?: string
          user_id: string
        }
        Update: {
          amount_paid?: number
          course_id?: string
          enrolled_at?: string
          id?: string
          payment_status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_files: {
        Row: {
          course_id: string
          created_at: string
          file_url: string
          id: string
          name: string
        }
        Insert: {
          course_id: string
          created_at?: string
          file_url: string
          id?: string
          name: string
        }
        Update: {
          course_id?: string
          created_at?: string
          file_url?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      course_lesson_files: {
        Row: {
          created_at: string
          file_url: string
          id: string
          lesson_id: string
          name: string
        }
        Insert: {
          created_at?: string
          file_url: string
          id?: string
          lesson_id: string
          name: string
        }
        Update: {
          created_at?: string
          file_url?: string
          id?: string
          lesson_id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_lesson_files_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      course_lessons: {
        Row: {
          course_id: string
          created_at: string
          created_by: string | null
          description: string | null
          homework: string | null
          id: string
          sort_order: number
          title: string
          updated_at: string
          video_type: string
          video_url: string | null
        }
        Insert: {
          course_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          homework?: string | null
          id?: string
          sort_order?: number
          title: string
          updated_at?: string
          video_type?: string
          video_url?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          homework?: string | null
          id?: string
          sort_order?: number
          title?: string
          updated_at?: string
          video_type?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_free: boolean
          is_published: boolean
          price: number
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_type: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_free?: boolean
          is_published?: boolean
          price?: number
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_type?: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_free?: boolean
          is_published?: boolean
          price?: number
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_type?: string
          video_url?: string | null
        }
        Relationships: []
      }
      delete_requests: {
        Row: {
          created_at: string
          id: string
          reason: string | null
          requester_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          target_id: string
          target_name: string | null
          target_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason?: string | null
          requester_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_id: string
          target_name?: string | null
          target_type: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string | null
          requester_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_id?: string
          target_name?: string | null
          target_type?: string
        }
        Relationships: []
      }
      meal_plan_items: {
        Row: {
          created_at: string
          id: string
          recipe_id: string
          servings: number
          times_per_week: number
          user_id: string
          week_start: string
        }
        Insert: {
          created_at?: string
          id?: string
          recipe_id: string
          servings?: number
          times_per_week?: number
          user_id: string
          week_start: string
        }
        Update: {
          created_at?: string
          id?: string
          recipe_id?: string
          servings?: number
          times_per_week?: number
          user_id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_plan_items_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_sections: {
        Row: {
          created_at: string
          id: string
          recipe_id: string
          section_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          recipe_id: string
          section_id: string
        }
        Update: {
          created_at?: string
          id?: string
          recipe_id?: string
          section_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_sections_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_sections_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          category: string
          cook_time_min: number
          created_at: string
          created_by: string | null
          cuisine: string
          default_servings: number
          description: string | null
          id: string
          image_url: string | null
          ingredients: Json
          instructions: string | null
          is_global: boolean
          name: string
          prep_time_min: number
          updated_at: string
          video_type: string | null
          video_url: string | null
        }
        Insert: {
          category?: string
          cook_time_min?: number
          created_at?: string
          created_by?: string | null
          cuisine?: string
          default_servings?: number
          description?: string | null
          id?: string
          image_url?: string | null
          ingredients?: Json
          instructions?: string | null
          is_global?: boolean
          name: string
          prep_time_min?: number
          updated_at?: string
          video_type?: string | null
          video_url?: string | null
        }
        Update: {
          category?: string
          cook_time_min?: number
          created_at?: string
          created_by?: string | null
          cuisine?: string
          default_servings?: number
          description?: string | null
          id?: string
          image_url?: string | null
          ingredients?: Json
          instructions?: string | null
          is_global?: boolean
          name?: string
          prep_time_min?: number
          updated_at?: string
          video_type?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      sections: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          accent_color: string
          background_color: string
          created_at: string
          favicon_url: string | null
          font_body: string
          font_display: string
          foreground_color: string
          hero_subtitle: string
          hero_title: string
          id: string
          logo_url: string | null
          meta_description: string
          primary_color: string
          singleton: boolean
          site_name: string
          spice_color: string
          tagline: string
          updated_at: string
        }
        Insert: {
          accent_color?: string
          background_color?: string
          created_at?: string
          favicon_url?: string | null
          font_body?: string
          font_display?: string
          foreground_color?: string
          hero_subtitle?: string
          hero_title?: string
          id?: string
          logo_url?: string | null
          meta_description?: string
          primary_color?: string
          singleton?: boolean
          site_name?: string
          spice_color?: string
          tagline?: string
          updated_at?: string
        }
        Update: {
          accent_color?: string
          background_color?: string
          created_at?: string
          favicon_url?: string | null
          font_body?: string
          font_display?: string
          foreground_color?: string
          hero_subtitle?: string
          hero_title?: string
          id?: string
          logo_url?: string | null
          meta_description?: string
          primary_color?: string
          singleton?: boolean
          site_name?: string
          spice_color?: string
          tagline?: string
          updated_at?: string
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
          role?: Database["public"]["Enums"]["app_role"]
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
      app_role: "admin" | "user" | "coach"
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
      app_role: ["admin", "user", "coach"],
    },
  },
} as const
