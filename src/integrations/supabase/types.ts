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
      campaign_documents: {
        Row: {
          campaign_id: string
          created_at: string
          file_path: string
          file_size: number | null
          file_type: string
          id: string
          name: string
          uploaded_by: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          file_path: string
          file_size?: number | null
          file_type?: string
          id?: string
          name: string
          uploaded_by: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          file_path?: string
          file_size?: number | null
          file_type?: string
          id?: string
          name?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_documents_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_maps: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          image_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          image_url?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          image_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_maps_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: true
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_players: {
        Row: {
          additional_info: string | null
          campaign_id: string
          current_points: number | null
          faction: string | null
          id: string
          joined_at: string
          player_name: string | null
          role: string
          sub_faction: string | null
          user_id: string
          warband_link: string | null
        }
        Insert: {
          additional_info?: string | null
          campaign_id: string
          current_points?: number | null
          faction?: string | null
          id?: string
          joined_at?: string
          player_name?: string | null
          role?: string
          sub_faction?: string | null
          user_id: string
          warband_link?: string | null
        }
        Update: {
          additional_info?: string | null
          campaign_id?: string
          current_points?: number | null
          faction?: string | null
          id?: string
          joined_at?: string
          player_name?: string | null
          role?: string
          sub_faction?: string | null
          user_id?: string
          warband_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_players_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_units: {
        Row: {
          abilities: Json
          base_cost: number
          campaign_id: string
          created_at: string
          equipment_options: Json
          faction: string
          id: string
          keywords: Json
          name: string
          source: string
          source_ref: string | null
          stats: Json
          sub_faction: string | null
          updated_at: string
        }
        Insert: {
          abilities?: Json
          base_cost?: number
          campaign_id: string
          created_at?: string
          equipment_options?: Json
          faction: string
          id?: string
          keywords?: Json
          name: string
          source?: string
          source_ref?: string | null
          stats?: Json
          sub_faction?: string | null
          updated_at?: string
        }
        Update: {
          abilities?: Json
          base_cost?: number
          campaign_id?: string
          created_at?: string
          equipment_options?: Json
          faction?: string
          id?: string
          keywords?: Json
          name?: string
          source?: string
          source_ref?: string | null
          stats?: Json
          sub_faction?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_units_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          border_color: string | null
          created_at: string
          current_round: number | null
          description: string | null
          display_settings: Json | null
          end_date: string | null
          game_system: string | null
          game_system_id: string | null
          id: string
          join_code: string | null
          max_players: number | null
          name: string
          owner_id: string
          password: string | null
          points_limit: number | null
          round_length: string | null
          rules_repo_ref: string | null
          rules_repo_url: string | null
          start_date: string | null
          status: string | null
          title_color: string | null
          total_rounds: number | null
          updated_at: string
        }
        Insert: {
          border_color?: string | null
          created_at?: string
          current_round?: number | null
          description?: string | null
          display_settings?: Json | null
          end_date?: string | null
          game_system?: string | null
          game_system_id?: string | null
          id?: string
          join_code?: string | null
          max_players?: number | null
          name: string
          owner_id: string
          password?: string | null
          points_limit?: number | null
          round_length?: string | null
          rules_repo_ref?: string | null
          rules_repo_url?: string | null
          start_date?: string | null
          status?: string | null
          title_color?: string | null
          total_rounds?: number | null
          updated_at?: string
        }
        Update: {
          border_color?: string | null
          created_at?: string
          current_round?: number | null
          description?: string | null
          display_settings?: Json | null
          end_date?: string | null
          game_system?: string | null
          game_system_id?: string | null
          id?: string
          join_code?: string | null
          max_players?: number | null
          name?: string
          owner_id?: string
          password?: string | null
          points_limit?: number | null
          round_length?: string | null
          rules_repo_ref?: string | null
          rules_repo_url?: string | null
          start_date?: string | null
          status?: string | null
          title_color?: string | null
          total_rounds?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_game_system_id_fkey"
            columns: ["game_system_id"]
            isOneToOne: false
            referencedRelation: "game_systems"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_components: {
        Row: {
          campaign_id: string
          component_type: string
          config: Json | null
          created_at: string
          data_source: string
          height: number
          id: string
          name: string
          position_x: number
          position_y: number
          updated_at: string
          visibility: string
          width: number
        }
        Insert: {
          campaign_id: string
          component_type: string
          config?: Json | null
          created_at?: string
          data_source?: string
          height?: number
          id?: string
          name: string
          position_x?: number
          position_y?: number
          updated_at?: string
          visibility?: string
          width?: number
        }
        Update: {
          campaign_id?: string
          component_type?: string
          config?: Json | null
          created_at?: string
          data_source?: string
          height?: number
          id?: string
          name?: string
          position_x?: number
          position_y?: number
          updated_at?: string
          visibility?: string
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_components_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      dice_roll_history: {
        Row: {
          campaign_id: string
          dice_config: string
          id: string
          player_id: string
          player_name: string
          rolled_at: string
          rolls: number[]
          total: number
        }
        Insert: {
          campaign_id: string
          dice_config: string
          id?: string
          player_id: string
          player_name: string
          rolled_at?: string
          rolls: number[]
          total: number
        }
        Update: {
          campaign_id?: string
          dice_config?: string
          id?: string
          player_id?: string
          player_name?: string
          rolled_at?: string
          rolls?: number[]
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "dice_roll_history_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      error_reports: {
        Row: {
          component_stack: string | null
          created_at: string
          error_message: string
          error_type: string
          fingerprint: string
          id: string
          last_occurred_at: string
          metadata: Json | null
          occurrence_count: number
          route: string | null
          stack_trace: string | null
          status: string
          url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          component_stack?: string | null
          created_at?: string
          error_message: string
          error_type?: string
          fingerprint: string
          id?: string
          last_occurred_at?: string
          metadata?: Json | null
          occurrence_count?: number
          route?: string | null
          stack_trace?: string | null
          status?: string
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          component_stack?: string | null
          created_at?: string
          error_message?: string
          error_type?: string
          fingerprint?: string
          id?: string
          last_occurred_at?: string
          metadata?: Json | null
          occurrence_count?: number
          route?: string | null
          stack_trace?: string | null
          status?: string
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      extraction_jobs: {
        Row: {
          campaign_id: string
          completed_sections: number | null
          created_at: string
          detected_sections: Json | null
          error_message: string | null
          id: string
          source_name: string | null
          status: string
          total_sections: number | null
          updated_at: string
        }
        Insert: {
          campaign_id: string
          completed_sections?: number | null
          created_at?: string
          detected_sections?: Json | null
          error_message?: string | null
          id?: string
          source_name?: string | null
          status?: string
          total_sections?: number | null
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          completed_sections?: number | null
          created_at?: string
          detected_sections?: Json | null
          error_message?: string | null
          id?: string
          source_name?: string | null
          status?: string
          total_sections?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "extraction_jobs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      game_systems: {
        Row: {
          created_at: string
          description: string | null
          icon_url: string | null
          id: string
          last_synced_at: string | null
          name: string
          repo_type: string
          repo_url: string | null
          slug: string
          status: string
          updated_at: string
          version: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          last_synced_at?: string | null
          name: string
          repo_type?: string
          repo_url?: string | null
          slug: string
          status?: string
          updated_at?: string
          version?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          last_synced_at?: string | null
          name?: string
          repo_type?: string
          repo_url?: string | null
          slug?: string
          status?: string
          updated_at?: string
          version?: string | null
        }
        Relationships: []
      }
      map_fog_regions: {
        Row: {
          created_at: string
          height: number
          id: string
          map_id: string
          position_x: number
          position_y: number
          revealed: boolean
          width: number
        }
        Insert: {
          created_at?: string
          height?: number
          id?: string
          map_id: string
          position_x?: number
          position_y?: number
          revealed?: boolean
          width?: number
        }
        Update: {
          created_at?: string
          height?: number
          id?: string
          map_id?: string
          position_x?: number
          position_y?: number
          revealed?: boolean
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "map_fog_regions_map_id_fkey"
            columns: ["map_id"]
            isOneToOne: false
            referencedRelation: "campaign_maps"
            referencedColumns: ["id"]
          },
        ]
      }
      map_legend_items: {
        Row: {
          color: string
          created_at: string
          id: string
          map_id: string
          name: string
          order_index: number
          shape: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          map_id: string
          name: string
          order_index?: number
          shape?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          map_id?: string
          name?: string
          order_index?: number
          shape?: string
        }
        Relationships: [
          {
            foreignKeyName: "map_legend_items_map_id_fkey"
            columns: ["map_id"]
            isOneToOne: false
            referencedRelation: "campaign_maps"
            referencedColumns: ["id"]
          },
        ]
      }
      map_markers: {
        Row: {
          created_at: string
          id: string
          label: string | null
          legend_item_id: string | null
          map_id: string
          position_x: number
          position_y: number
          visibility: string
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string | null
          legend_item_id?: string | null
          map_id: string
          position_x?: number
          position_y?: number
          visibility?: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string | null
          legend_item_id?: string | null
          map_id?: string
          position_x?: number
          position_y?: number
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "map_markers_legend_item_id_fkey"
            columns: ["legend_item_id"]
            isOneToOne: false
            referencedRelation: "map_legend_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "map_markers_map_id_fkey"
            columns: ["map_id"]
            isOneToOne: false
            referencedRelation: "campaign_maps"
            referencedColumns: ["id"]
          },
        ]
      }
      master_factions: {
        Row: {
          created_at: string
          description: string | null
          game_system_id: string
          id: string
          name: string
          rules_text: Json | null
          slug: string
          source_file: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          game_system_id: string
          id?: string
          name: string
          rules_text?: Json | null
          slug: string
          source_file?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          game_system_id?: string
          id?: string
          name?: string
          rules_text?: Json | null
          slug?: string
          source_file?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "master_factions_game_system_id_fkey"
            columns: ["game_system_id"]
            isOneToOne: false
            referencedRelation: "game_systems"
            referencedColumns: ["id"]
          },
        ]
      }
      master_rules: {
        Row: {
          category: string
          content: Json
          created_at: string
          faction_id: string | null
          game_system_id: string
          id: string
          rule_key: string
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          category: string
          content?: Json
          created_at?: string
          faction_id?: string | null
          game_system_id: string
          id?: string
          rule_key: string
          title: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          category?: string
          content?: Json
          created_at?: string
          faction_id?: string | null
          game_system_id?: string
          id?: string
          rule_key?: string
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "master_rules_faction_id_fkey"
            columns: ["faction_id"]
            isOneToOne: false
            referencedRelation: "master_factions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_rules_game_system_id_fkey"
            columns: ["game_system_id"]
            isOneToOne: false
            referencedRelation: "game_systems"
            referencedColumns: ["id"]
          },
        ]
      }
      master_units: {
        Row: {
          abilities: Json
          base_cost: number
          constraints: Json | null
          created_at: string
          equipment_options: Json
          faction_id: string
          game_system_id: string
          id: string
          keywords: Json
          name: string
          source_id: string | null
          stats: Json
          updated_at: string
        }
        Insert: {
          abilities?: Json
          base_cost?: number
          constraints?: Json | null
          created_at?: string
          equipment_options?: Json
          faction_id: string
          game_system_id: string
          id?: string
          keywords?: Json
          name: string
          source_id?: string | null
          stats?: Json
          updated_at?: string
        }
        Update: {
          abilities?: Json
          base_cost?: number
          constraints?: Json | null
          created_at?: string
          equipment_options?: Json
          faction_id?: string
          game_system_id?: string
          id?: string
          keywords?: Json
          name?: string
          source_id?: string | null
          stats?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "master_units_faction_id_fkey"
            columns: ["faction_id"]
            isOneToOne: false
            referencedRelation: "master_factions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_units_game_system_id_fkey"
            columns: ["game_system_id"]
            isOneToOne: false
            referencedRelation: "game_systems"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          author_id: string
          campaign_id: string
          content: string
          created_at: string
          id: string
          priority: string | null
        }
        Insert: {
          author_id: string
          campaign_id: string
          content: string
          created_at?: string
          id?: string
          priority?: string | null
        }
        Update: {
          author_id?: string
          campaign_id?: string
          content?: string
          created_at?: string
          id?: string
          priority?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      narrative_events: {
        Row: {
          author_id: string
          campaign_id: string
          content: string
          created_at: string
          event_date: string | null
          event_type: string | null
          id: string
          image_url: string | null
          title: string
          visibility: string | null
        }
        Insert: {
          author_id: string
          campaign_id: string
          content: string
          created_at?: string
          event_date?: string | null
          event_type?: string | null
          id?: string
          image_url?: string | null
          title: string
          visibility?: string | null
        }
        Update: {
          author_id?: string
          campaign_id?: string
          content?: string
          created_at?: string
          event_date?: string | null
          event_type?: string | null
          id?: string
          image_url?: string | null
          title?: string
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "narrative_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      player_narrative_entries: {
        Row: {
          campaign_id: string
          content: string
          created_at: string
          id: string
          player_id: string
          title: string
          updated_at: string
        }
        Insert: {
          campaign_id: string
          content?: string
          created_at?: string
          id?: string
          player_id: string
          title?: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          content?: string
          created_at?: string
          id?: string
          player_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_narrative_entries_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      schedule_entries: {
        Row: {
          campaign_id: string
          color: string | null
          created_at: string
          end_date: string | null
          entry_type: string | null
          id: string
          round_number: number
          scenario: string | null
          scheduled_date: string | null
          start_date: string | null
          status: string | null
          title: string
        }
        Insert: {
          campaign_id: string
          color?: string | null
          created_at?: string
          end_date?: string | null
          entry_type?: string | null
          id?: string
          round_number: number
          scenario?: string | null
          scheduled_date?: string | null
          start_date?: string | null
          status?: string | null
          title: string
        }
        Update: {
          campaign_id?: string
          color?: string | null
          created_at?: string
          end_date?: string | null
          entry_type?: string | null
          id?: string
          round_number?: number
          scenario?: string | null
          scheduled_date?: string | null
          start_date?: string | null
          status?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_entries_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
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
      warbands: {
        Row: {
          campaign_id: string
          created_at: string
          faction: string | null
          id: string
          name: string
          narrative: string | null
          owner_id: string
          points_total: number | null
          roster: Json | null
          sub_faction: string | null
          updated_at: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          faction?: string | null
          id?: string
          name: string
          narrative?: string | null
          owner_id: string
          points_total?: number | null
          roster?: Json | null
          sub_faction?: string | null
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          faction?: string | null
          id?: string
          name?: string
          narrative?: string | null
          owner_id?: string
          points_total?: number | null
          roster?: Json | null
          sub_faction?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "warbands_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      wargame_rules: {
        Row: {
          campaign_id: string
          category: string
          content: Json
          created_at: string
          extraction_job_id: string | null
          id: string
          metadata: Json | null
          rule_key: string
          source_section: string | null
          title: string
          updated_at: string
          validation_status: string | null
        }
        Insert: {
          campaign_id: string
          category: string
          content?: Json
          created_at?: string
          extraction_job_id?: string | null
          id?: string
          metadata?: Json | null
          rule_key: string
          source_section?: string | null
          title: string
          updated_at?: string
          validation_status?: string | null
        }
        Update: {
          campaign_id?: string
          category?: string
          content?: Json
          created_at?: string
          extraction_job_id?: string | null
          id?: string
          metadata?: Json | null
          rule_key?: string
          source_section?: string | null
          title?: string
          updated_at?: string
          validation_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wargame_rules_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wargame_rules_extraction_job_id_fkey"
            columns: ["extraction_job_id"]
            isOneToOne: false
            referencedRelation: "extraction_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_join_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
