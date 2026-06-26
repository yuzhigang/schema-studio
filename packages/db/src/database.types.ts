export type EntityType = "project" | "category" | "table" | "column";

export type TeamRole = "owner" | "admin" | "editor" | "viewer";

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T];
export type Enums<T extends keyof Database["public"]["Enums"]> = Database["public"]["Enums"][T];

export interface Database {
  public: {
    Tables: {
      profile: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "profile_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      team: {
        Row: {
          id: string;
          name: string;
          slug: string | null;
          short_code: string | null;
          icon: string | null;
          description: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          slug?: string | null;
          short_code?: string | null;
          icon?: string | null;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string | null;
          short_code?: string | null;
          icon?: string | null;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      team_member: {
        Row: {
          id: string;
          team_id: string;
          user_id: string;
          role: TeamRole;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          team_id: string;
          user_id: string;
          role?: TeamRole;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          team_id?: string;
          user_id?: string;
          role?: TeamRole;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "team_member_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "team";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_member_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profile";
            referencedColumns: ["id"];
          },
        ];
      };
      team_invite: {
        Row: {
          id: string;
          team_id: string;
          invited_by: string;
          role: TeamRole;
          token: string;
          expires_at: string;
          used_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          invited_by: string;
          role?: TeamRole;
          token: string;
          expires_at: string;
          used_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          invited_by?: string;
          role?: TeamRole;
          token?: string;
          expires_at?: string;
          used_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "team_invite_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "team";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_invite_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "profile";
            referencedColumns: ["id"];
          },
        ];
      };
      project_member: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          role: "admin" | "editor" | "viewer";
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          role?: "admin" | "editor" | "viewer";
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          role?: "admin" | "editor" | "viewer";
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "project_member_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_member_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profile";
            referencedColumns: ["id"];
          },
        ];
      };
      project: {
        Row: {
          id: string;
          team_id: string;
          name: string;
          description: string | null;
          color: string | null;
          short_code: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          team_id: string;
          name: string;
          description?: string | null;
          color?: string | null;
          short_code?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          team_id?: string;
          name?: string;
          description?: string | null;
          color?: string | null;
          short_code?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "project_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "team";
            referencedColumns: ["id"];
          },
        ];
      };
      category: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          description: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          project_id?: string;
          name?: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "category_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project";
            referencedColumns: ["id"];
          },
        ];
      };
      schema_table: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          logical_name: string | null;
          description: string | null;
          version: number;
          version_selected: boolean;
          version_group_id: string | null;
          ref_table_id: string | null;
          short_code: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          logical_name?: string | null;
          description?: string | null;
          version?: number;
          version_selected?: boolean;
          version_group_id?: string | null;
          ref_table_id?: string | null;
          short_code?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          project_id?: string;
          name?: string;
          logical_name?: string | null;
          description?: string | null;
          version?: number;
          version_selected?: boolean;
          version_group_id?: string | null;
          ref_table_id?: string | null;
          short_code?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "schema_table_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "schema_table_version_group_id_fkey";
            columns: ["version_group_id"];
            isOneToOne: false;
            referencedRelation: "schema_table";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "schema_table_ref_table_id_fkey";
            columns: ["ref_table_id"];
            isOneToOne: false;
            referencedRelation: "schema_table";
            referencedColumns: ["id"];
          },
        ];
      };
      schema_column: {
        Row: {
          id: string;
          table_id: string;
          project_id: string;
          name: string;
          logical_name: string | null;
          data_type: string;
          length: number;
          primary_key: boolean;
          not_null: boolean;
          auto_increment: boolean;
          updated: boolean;
          unique_flag: boolean;
          index: boolean | null;
          default_value: string | null;
          comment: string | null;
          description: string | null;
          fk_table_id: string | null;
          fk_column_id: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          table_id: string;
          project_id: string;
          name: string;
          logical_name?: string | null;
          data_type?: string;
          length?: number;
          primary_key?: boolean;
          not_null?: boolean;
          auto_increment?: boolean;
          updated?: boolean;
          unique_flag?: boolean;
          index?: boolean | null;
          default_value?: string | null;
          comment?: string | null;
          fk_table_id?: string | null;
          fk_column_id?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          table_id?: string;
          project_id?: string;
          name?: string;
          logical_name?: string | null;
          data_type?: string;
          length?: number;
          primary_key?: boolean;
          not_null?: boolean;
          auto_increment?: boolean;
          updated?: boolean;
          unique_flag?: boolean;
          index?: boolean | null;
          default_value?: string | null;
          comment?: string | null;
          fk_table_id?: string | null;
          fk_column_id?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "schema_column_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "schema_column_table_id_fkey";
            columns: ["table_id"];
            isOneToOne: false;
            referencedRelation: "schema_table";
            referencedColumns: ["id"];
          },
        ];
      };
      tree_node: {
        Row: {
          id: string;
          project_id: string;
          entity_type: EntityType;
          entity_id: string;
          parent_id: string | null;
          level: number;
          path_code: string;
          children_count: number;
          sort_order: number;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          entity_type: EntityType;
          entity_id: string;
          parent_id?: string | null;
          level?: number;
          path_code?: string;
          children_count?: number;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          project_id?: string;
          entity_type?: EntityType;
          entity_id?: string;
          parent_id?: string | null;
          level?: number;
          path_code?: string;
          children_count?: number;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tree_node_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      user_team_ids: {
        Args: Record<string, never>;
        Returns: string[];
      };
    };
    Enums: {
      entity_type: EntityType;
    };
    CompositeTypes: Record<string, never>;
  };
}
