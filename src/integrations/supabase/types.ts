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
          campaign_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          campaign_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
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
          created_at: string
          description: string | null
          game_system_id: string | null
          id: string
          name: string
          owner_id: string
          points_limit: number | null
          rules_repo_ref: string | null
          rules_repo_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          game_system_id?: string | null
          id?: string
          name: string
          owner_id: string
          points_limit?: number | null
          rules_repo_ref?: string | null
          rules_repo_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          game_system_id?: string | null
          id?: string
          name?: string
          owner_id?: string
          points_limit?: number | null
          rules_repo_ref?: string | null
          rules_repo_url?: string | null
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
          linked_chunk_ids: string[] | null
          linked_dataset_id: string | null
          linked_section_ids: string[] | null
          linked_table_id: string | null
          name: string
          position_x: number
          position_y: number
          source_id: string | null
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
          linked_chunk_ids?: string[] | null
          linked_dataset_id?: string | null
          linked_section_ids?: string[] | null
          linked_table_id?: string | null
          name: string
          position_x?: number
          position_y?: number
          source_id?: string | null
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
          linked_chunk_ids?: string[] | null
          linked_dataset_id?: string | null
          linked_section_ids?: string[] | null
          linked_table_id?: string | null
          name?: string
          position_x?: number
          position_y?: number
          source_id?: string | null
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
            foreignKeyName: "dashboard_components_linked_dataset_id_fkey"
            columns: ["linked_dataset_id"]
            isOneToOne: false
            referencedRelation: "rules_datasets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dashboard_components_linked_table_id_fkey"
            columns: ["linked_table_id"]
            isOneToOne: false
            referencedRelation: "rules_tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dashboard_components_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "rules_sources"
            referencedColumns: ["id"]
          },
        ]
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
      rules_chunks: {
        Row: {
          created_at: string
          id: string
          keywords: string[] | null
          order_index: number | null
          page_end: number | null
          page_start: number | null
          score_hints: Json | null
          section_id: string | null
          section_path: string[] | null
          source_id: string
          text: string
        }
        Insert: {
          created_at?: string
          id?: string
          keywords?: string[] | null
          order_index?: number | null
          page_end?: number | null
          page_start?: number | null
          score_hints?: Json | null
          section_id?: string | null
          section_path?: string[] | null
          source_id: string
          text: string
        }
        Update: {
          created_at?: string
          id?: string
          keywords?: string[] | null
          order_index?: number | null
          page_end?: number | null
          page_start?: number | null
          score_hints?: Json | null
          section_id?: string | null
          section_path?: string[] | null
          source_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "rules_chunks_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "rules_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rules_chunks_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "rules_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      rules_dataset_rows: {
        Row: {
          created_at: string
          data: Json
          dataset_id: string
          id: string
          page_number: number | null
          source_path: string | null
        }
        Insert: {
          created_at?: string
          data?: Json
          dataset_id: string
          id?: string
          page_number?: number | null
          source_path?: string | null
        }
        Update: {
          created_at?: string
          data?: Json
          dataset_id?: string
          id?: string
          page_number?: number | null
          source_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rules_dataset_rows_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "rules_datasets"
            referencedColumns: ["id"]
          },
        ]
      }
      rules_datasets: {
        Row: {
          confidence: string
          created_at: string
          dataset_type: string
          fields: Json | null
          id: string
          name: string
          source_id: string
        }
        Insert: {
          confidence?: string
          created_at?: string
          dataset_type?: string
          fields?: Json | null
          id?: string
          name: string
          source_id: string
        }
        Update: {
          confidence?: string
          created_at?: string
          dataset_type?: string
          fields?: Json | null
          id?: string
          name?: string
          source_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rules_datasets_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "rules_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      rules_pages: {
        Row: {
          char_count: number
          created_at: string
          id: string
          page_number: number
          source_id: string
          text: string
        }
        Insert: {
          char_count?: number
          created_at?: string
          id?: string
          page_number: number
          source_id: string
          text: string
        }
        Update: {
          char_count?: number
          created_at?: string
          id?: string
          page_number?: number
          source_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "rules_pages_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "rules_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      rules_sections: {
        Row: {
          created_at: string
          id: string
          keywords: string[] | null
          page_end: number | null
          page_start: number | null
          section_path: string[] | null
          source_id: string
          text: string | null
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          keywords?: string[] | null
          page_end?: number | null
          page_start?: number | null
          section_path?: string[] | null
          source_id: string
          text?: string | null
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          keywords?: string[] | null
          page_end?: number | null
          page_start?: number | null
          section_path?: string[] | null
          source_id?: string
          text?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "rules_sections_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "rules_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      rules_sources: {
        Row: {
          campaign_id: string
          created_at: string
          github_imported_at: string | null
          github_json_path: string | null
          github_repo_url: string | null
          github_sha: string | null
          id: string
          index_error: Json | null
          index_stats: Json | null
          index_status: string
          last_indexed_at: string | null
          pseudo_page_size: number | null
          raw_text: string | null
          storage_path: string | null
          tags: string[] | null
          title: string
          type: string
          type_source: string | null
          updated_at: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          github_imported_at?: string | null
          github_json_path?: string | null
          github_repo_url?: string | null
          github_sha?: string | null
          id?: string
          index_error?: Json | null
          index_stats?: Json | null
          index_status?: string
          last_indexed_at?: string | null
          pseudo_page_size?: number | null
          raw_text?: string | null
          storage_path?: string | null
          tags?: string[] | null
          title: string
          type: string
          type_source?: string | null
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          github_imported_at?: string | null
          github_json_path?: string | null
          github_repo_url?: string | null
          github_sha?: string | null
          id?: string
          index_error?: Json | null
          index_stats?: Json | null
          index_status?: string
          last_indexed_at?: string | null
          pseudo_page_size?: number | null
          raw_text?: string | null
          storage_path?: string | null
          tags?: string[] | null
          title?: string
          type?: string
          type_source?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rules_sources_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      rules_tables: {
        Row: {
          confidence: string
          created_at: string
          header_context: string | null
          id: string
          keywords: string[] | null
          page_number: number | null
          parsed_rows: Json | null
          raw_text: string | null
          section_id: string | null
          source_id: string
          title_guess: string | null
        }
        Insert: {
          confidence?: string
          created_at?: string
          header_context?: string | null
          id?: string
          keywords?: string[] | null
          page_number?: number | null
          parsed_rows?: Json | null
          raw_text?: string | null
          section_id?: string | null
          source_id: string
          title_guess?: string | null
        }
        Update: {
          confidence?: string
          created_at?: string
          header_context?: string | null
          id?: string
          keywords?: string[] | null
          page_number?: number | null
          parsed_rows?: Json | null
          raw_text?: string | null
          section_id?: string | null
          source_id?: string
          title_guess?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rules_tables_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "rules_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rules_tables_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "rules_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_entries: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          round_number: number
          scenario: string | null
          scheduled_date: string | null
          status: string | null
          title: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          round_number: number
          scenario?: string | null
          scheduled_date?: string | null
          status?: string | null
          title: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          round_number?: number
          scenario?: string | null
          scheduled_date?: string | null
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
