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
      battle_audit_trail: {
        Row: {
          action: string
          campaign_id: string
          changed_by: string
          changes: Json | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          reason: string | null
        }
        Insert: {
          action: string
          campaign_id: string
          changed_by: string
          changes?: Json | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          reason?: string | null
        }
        Update: {
          action?: string
          campaign_id?: string
          changed_by?: string
          changes?: Json | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "battle_audit_trail_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battle_audit_trail_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      battle_matches: {
        Row: {
          campaign_id: string
          created_at: string
          final_results: Json | null
          id: string
          is_bye: boolean
          match_index: number
          notes: string | null
          participants: Json
          provisional_results: Json | null
          round_id: string
          status: string
          updated_at: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          final_results?: Json | null
          id?: string
          is_bye?: boolean
          match_index?: number
          notes?: string | null
          participants?: Json
          provisional_results?: Json | null
          round_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          final_results?: Json | null
          id?: string
          is_bye?: boolean
          match_index?: number
          notes?: string | null
          participants?: Json
          provisional_results?: Json | null
          round_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "battle_matches_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battle_matches_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battle_matches_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "battle_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      battle_reports: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          attachments: Json | null
          created_at: string
          id: string
          injuries: Json | null
          loot_found: Json | null
          match_id: string
          narrative: string | null
          notable_events: Json | null
          outcome: string
          player_side: string
          points_earned: number | null
          resources: Json | null
          submitted_at: string
          submitted_by: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          attachments?: Json | null
          created_at?: string
          id?: string
          injuries?: Json | null
          loot_found?: Json | null
          match_id: string
          narrative?: string | null
          notable_events?: Json | null
          outcome: string
          player_side?: string
          points_earned?: number | null
          resources?: Json | null
          submitted_at?: string
          submitted_by: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          attachments?: Json | null
          created_at?: string
          id?: string
          injuries?: Json | null
          loot_found?: Json | null
          match_id?: string
          narrative?: string | null
          notable_events?: Json | null
          outcome?: string
          player_side?: string
          points_earned?: number | null
          resources?: Json | null
          submitted_at?: string
          submitted_by?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "battle_reports_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "battle_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      battle_rounds: {
        Row: {
          campaign_id: string
          constraints_config: Json | null
          created_at: string
          ends_at: string | null
          id: string
          name: string
          pairing_system: string
          report_fields_config: Json | null
          round_index: number
          scoring_config: Json | null
          starts_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          campaign_id: string
          constraints_config?: Json | null
          created_at?: string
          ends_at?: string | null
          id?: string
          name?: string
          pairing_system?: string
          report_fields_config?: Json | null
          round_index?: number
          scoring_config?: Json | null
          starts_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          constraints_config?: Json | null
          created_at?: string
          ends_at?: string | null
          id?: string
          name?: string
          pairing_system?: string
          report_fields_config?: Json | null
          round_index?: number
          scoring_config?: Json | null
          starts_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "battle_rounds_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battle_rounds_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns_safe"
            referencedColumns: ["id"]
          },
        ]
      }
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
          {
            foreignKeyName: "campaign_documents_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns_safe"
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
          {
            foreignKeyName: "campaign_maps_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: true
            referencedRelation: "campaigns_safe"
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
          {
            foreignKeyName: "campaign_players_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns_safe"
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
          {
            foreignKeyName: "campaign_units_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          banner_url: string | null
          border_color: string | null
          created_at: string
          current_round: number | null
          description: string | null
          display_settings: Json | null
          end_date: string | null
          game_system: string | null
          game_system_id: string | null
          id: string
          is_archived: boolean
          join_code: string | null
          max_players: number | null
          name: string
          owner_id: string
          password_hash: string | null
          points_limit: number | null
          round_length: string | null
          rules_repo_ref: string | null
          rules_repo_url: string | null
          start_date: string | null
          status: string | null
          theme_id: string
          title_color: string | null
          total_rounds: number | null
          updated_at: string
        }
        Insert: {
          banner_url?: string | null
          border_color?: string | null
          created_at?: string
          current_round?: number | null
          description?: string | null
          display_settings?: Json | null
          end_date?: string | null
          game_system?: string | null
          game_system_id?: string | null
          id?: string
          is_archived?: boolean
          join_code?: string | null
          max_players?: number | null
          name: string
          owner_id: string
          password_hash?: string | null
          points_limit?: number | null
          round_length?: string | null
          rules_repo_ref?: string | null
          rules_repo_url?: string | null
          start_date?: string | null
          status?: string | null
          theme_id?: string
          title_color?: string | null
          total_rounds?: number | null
          updated_at?: string
        }
        Update: {
          banner_url?: string | null
          border_color?: string | null
          created_at?: string
          current_round?: number | null
          description?: string | null
          display_settings?: Json | null
          end_date?: string | null
          game_system?: string | null
          game_system_id?: string | null
          id?: string
          is_archived?: boolean
          join_code?: string | null
          max_players?: number | null
          name?: string
          owner_id?: string
          password_hash?: string | null
          points_limit?: number | null
          round_length?: string | null
          rules_repo_ref?: string | null
          rules_repo_url?: string | null
          start_date?: string | null
          status?: string | null
          theme_id?: string
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
          {
            foreignKeyName: "dashboard_components_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns_safe"
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
          {
            foreignKeyName: "dice_roll_history_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      donations: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          id: string
          stripe_checkout_session_id: string
          stripe_payment_intent_id: string | null
          user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          id?: string
          stripe_checkout_session_id: string
          stripe_payment_intent_id?: string | null
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          id?: string
          stripe_checkout_session_id?: string
          stripe_payment_intent_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      donor_feedback: {
        Row: {
          admin_response: string | null
          created_at: string
          feedback_type: string
          id: string
          is_read: boolean
          message: string
          responded_at: string | null
          user_id: string
        }
        Insert: {
          admin_response?: string | null
          created_at?: string
          feedback_type?: string
          id?: string
          is_read?: boolean
          message: string
          responded_at?: string | null
          user_id: string
        }
        Update: {
          admin_response?: string | null
          created_at?: string
          feedback_type?: string
          id?: string
          is_read?: boolean
          message?: string
          responded_at?: string | null
          user_id?: string
        }
        Relationships: []
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
          {
            foreignKeyName: "extraction_jobs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns_safe"
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
          is_read: boolean | null
          priority: string | null
          recipient_id: string | null
        }
        Insert: {
          author_id: string
          campaign_id: string
          content: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          priority?: string | null
          recipient_id?: string | null
        }
        Update: {
          author_id?: string
          campaign_id?: string
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          priority?: string | null
          recipient_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns_safe"
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
          {
            foreignKeyName: "narrative_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns_safe"
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
          {
            foreignKeyName: "player_narrative_entries_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          current_period_end: string | null
          display_name: string | null
          has_donated: boolean
          id: string
          plan: string
          stripe_customer_id: string | null
          subscription_status: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          current_period_end?: string | null
          display_name?: string | null
          has_donated?: boolean
          id: string
          plan?: string
          stripe_customer_id?: string | null
          subscription_status?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          current_period_end?: string | null
          display_name?: string | null
          has_donated?: boolean
          id?: string
          plan?: string
          stripe_customer_id?: string | null
          subscription_status?: string
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
          {
            foreignKeyName: "schedule_entries_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriber_interest: {
        Row: {
          clicked_at: string
          id: string
          user_id: string
        }
        Insert: {
          clicked_at?: string
          id?: string
          user_id: string
        }
        Update: {
          clicked_at?: string
          id?: string
          user_id?: string
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
          {
            foreignKeyName: "warbands_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns_safe"
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
            foreignKeyName: "wargame_rules_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns_safe"
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
      campaigns_safe: {
        Row: {
          banner_url: string | null
          border_color: string | null
          created_at: string | null
          current_round: number | null
          description: string | null
          display_settings: Json | null
          end_date: string | null
          game_system: string | null
          game_system_id: string | null
          has_password: boolean | null
          id: string | null
          is_archived: boolean | null
          join_code: string | null
          max_players: number | null
          name: string | null
          owner_id: string | null
          points_limit: number | null
          round_length: string | null
          rules_repo_ref: string | null
          rules_repo_url: string | null
          start_date: string | null
          status: string | null
          theme_id: string | null
          title_color: string | null
          total_rounds: number | null
          updated_at: string | null
        }
        Insert: {
          banner_url?: string | null
          border_color?: string | null
          created_at?: string | null
          current_round?: number | null
          description?: string | null
          display_settings?: Json | null
          end_date?: string | null
          game_system?: string | null
          game_system_id?: string | null
          has_password?: never
          id?: string | null
          is_archived?: boolean | null
          join_code?: string | null
          max_players?: number | null
          name?: string | null
          owner_id?: string | null
          points_limit?: number | null
          round_length?: string | null
          rules_repo_ref?: string | null
          rules_repo_url?: string | null
          start_date?: string | null
          status?: string | null
          theme_id?: string | null
          title_color?: string | null
          total_rounds?: number | null
          updated_at?: string | null
        }
        Update: {
          banner_url?: string | null
          border_color?: string | null
          created_at?: string | null
          current_round?: number | null
          description?: string | null
          display_settings?: Json | null
          end_date?: string | null
          game_system?: string | null
          game_system_id?: string | null
          has_password?: never
          id?: string | null
          is_archived?: boolean | null
          join_code?: string | null
          max_players?: number | null
          name?: string | null
          owner_id?: string | null
          points_limit?: number | null
          round_length?: string | null
          rules_repo_ref?: string | null
          rules_repo_url?: string | null
          start_date?: string | null
          status?: string | null
          theme_id?: string | null
          title_color?: string | null
          total_rounds?: number | null
          updated_at?: string | null
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
      profiles_public: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_create_campaign: { Args: { _user_id: string }; Returns: boolean }
      count_active_campaigns: { Args: { _user_id: string }; Returns: number }
      generate_join_code: { Args: never; Returns: string }
      get_public_profiles: {
        Args: never
        Returns: {
          avatar_url: string
          display_name: string
          id: string
        }[]
      }
      get_user_entitlements: { Args: { _user_id: string }; Returns: Json }
      has_full_gm_access: {
        Args: { _campaign_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_campaign_gm: {
        Args: { _campaign_id: string; _user_id: string }
        Returns: boolean
      }
      is_campaign_member: {
        Args: { _campaign_id: string; _user_id: string }
        Returns: boolean
      }
      is_campaign_owner: {
        Args: { _campaign_id: string; _user_id: string }
        Returns: boolean
      }
      lookup_campaign_by_code: {
        Args: { join_code_input: string }
        Returns: {
          description: string
          game_system: string
          has_password: boolean
          id: string
          max_players: number
          name: string
          player_count: number
        }[]
      }
      set_campaign_password: {
        Args: { campaign_id: string; new_password: string }
        Returns: undefined
      }
      verify_campaign_password: {
        Args: { campaign_id: string; input_password: string }
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
