export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          meta: Json
          project_id: string | null
          task_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          meta?: Json
          project_id?: string | null
          task_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          meta?: Json
          project_id?: string | null
          task_id?: string | null
        }
        Relationships: []
      }
      attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          task_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          task_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          task_id?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      automation_rules: {
        Row: {
          action_config: Json
          action_type: Database["public"]["Enums"]["automation_action"]
          created_at: string
          created_by: string | null
          enabled: boolean
          id: string
          name: string
          project_id: string
          trigger_config: Json
          trigger_type: Database["public"]["Enums"]["automation_trigger"]
        }
        Insert: {
          action_config?: Json
          action_type: Database["public"]["Enums"]["automation_action"]
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          id?: string
          name: string
          project_id: string
          trigger_config?: Json
          trigger_type: Database["public"]["Enums"]["automation_trigger"]
        }
        Update: {
          action_config?: Json
          action_type?: Database["public"]["Enums"]["automation_action"]
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          id?: string
          name?: string
          project_id?: string
          trigger_config?: Json
          trigger_type?: Database["public"]["Enums"]["automation_trigger"]
        }
        Relationships: []
      }
      comments: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          id: string
          task_id: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          task_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          task_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      custom_field_values: {
        Row: {
          custom_field_id: string
          id: string
          task_id: string
          updated_at: string
          value_bool: boolean | null
          value_date: string | null
          value_number: number | null
          value_option_ids: Json
          value_text: string | null
          value_user_id: string | null
        }
        Insert: {
          custom_field_id: string
          id?: string
          task_id: string
          updated_at?: string
          value_bool?: boolean | null
          value_date?: string | null
          value_number?: number | null
          value_option_ids?: Json
          value_text?: string | null
          value_user_id?: string | null
        }
        Update: {
          custom_field_id?: string
          id?: string
          task_id?: string
          updated_at?: string
          value_bool?: boolean | null
          value_date?: string | null
          value_number?: number | null
          value_option_ids?: Json
          value_text?: string | null
          value_user_id?: string | null
        }
        Relationships: []
      }
      custom_fields: {
        Row: {
          created_at: string
          id: string
          name: string
          options: Json
          position: number
          project_id: string | null
          type: Database["public"]["Enums"]["custom_field_type"]
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          options?: Json
          position?: number
          project_id?: string | null
          type: Database["public"]["Enums"]["custom_field_type"]
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          options?: Json
          position?: number
          project_id?: string | null
          type?: Database["public"]["Enums"]["custom_field_type"]
          workspace_id?: string
        }
        Relationships: []
      }
      forms: {
        Row: {
          created_at: string
          description: string | null
          enabled: boolean
          fields: Json
          id: string
          name: string
          project_id: string
          target_section_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          fields?: Json
          id?: string
          name: string
          project_id: string
          target_section_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          fields?: Json
          id?: string
          name?: string
          project_id?: string
          target_section_id?: string | null
        }
        Relationships: []
      }
      goal_projects: {
        Row: { goal_id: string; project_id: string }
        Insert: { goal_id: string; project_id: string }
        Update: { goal_id?: string; project_id?: string }
        Relationships: []
      }
      goals: {
        Row: {
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          name: string
          owner_id: string | null
          parent_goal_id: string | null
          progress: number
          status: Database["public"]["Enums"]["goal_status"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          name: string
          owner_id?: string | null
          parent_goal_id?: string | null
          progress?: number
          status?: Database["public"]["Enums"]["goal_status"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          name?: string
          owner_id?: string | null
          parent_goal_id?: string | null
          progress?: number
          status?: Database["public"]["Enums"]["goal_status"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
      invites: {
        Row: {
          accepted: boolean
          created_at: string
          email: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["workspace_role"]
          token: string
          workspace_id: string
        }
        Insert: {
          accepted?: boolean
          created_at?: string
          email: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["workspace_role"]
          token?: string
          workspace_id: string
        }
        Update: {
          accepted?: boolean
          created_at?: string
          email?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["workspace_role"]
          token?: string
          workspace_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          message: string
          project_id: string | null
          read: boolean
          task_id: string | null
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          message: string
          project_id?: string | null
          read?: boolean
          task_id?: string | null
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          message?: string
          project_id?: string | null
          read?: boolean
          task_id?: string | null
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: []
      }
      portfolio_projects: {
        Row: { portfolio_id: string; project_id: string }
        Insert: { portfolio_id: string; project_id: string }
        Update: { portfolio_id?: string; project_id?: string }
        Relationships: []
      }
      portfolios: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          owner_id: string | null
          workspace_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          owner_id?: string | null
          workspace_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          owner_id?: string | null
          workspace_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_color: string | null
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          avatar_color?: string | null
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          avatar_color?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      project_members: {
        Row: {
          added_at: string
          project_id: string
          role: Database["public"]["Enums"]["project_role"]
          user_id: string
        }
        Insert: {
          added_at?: string
          project_id: string
          role?: Database["public"]["Enums"]["project_role"]
          user_id: string
        }
        Update: {
          added_at?: string
          project_id?: string
          role?: Database["public"]["Enums"]["project_role"]
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          archived: boolean
          color: string | null
          created_at: string
          created_by: string | null
          default_view: string
          description: string | null
          due_date: string | null
          icon: string | null
          id: string
          name: string
          privacy: Database["public"]["Enums"]["project_privacy"]
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"]
          status_note: string | null
          team_id: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          archived?: boolean
          color?: string | null
          created_at?: string
          created_by?: string | null
          default_view?: string
          description?: string | null
          due_date?: string | null
          icon?: string | null
          id?: string
          name: string
          privacy?: Database["public"]["Enums"]["project_privacy"]
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          status_note?: string | null
          team_id?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          archived?: boolean
          color?: string | null
          created_at?: string
          created_by?: string | null
          default_view?: string
          description?: string | null
          due_date?: string | null
          icon?: string | null
          id?: string
          name?: string
          privacy?: Database["public"]["Enums"]["project_privacy"]
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          status_note?: string | null
          team_id?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
      sections: {
        Row: {
          created_at: string
          id: string
          is_completed_section: boolean
          name: string
          position: number
          project_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_completed_section?: boolean
          name: string
          position?: number
          project_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_completed_section?: boolean
          name?: string
          position?: number
          project_id?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          workspace_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          workspace_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          workspace_id?: string
        }
        Relationships: []
      }
      task_dependencies: {
        Row: {
          created_at: string
          depends_on_task_id: string
          task_id: string
          type: Database["public"]["Enums"]["dependency_type"]
        }
        Insert: {
          created_at?: string
          depends_on_task_id: string
          task_id: string
          type?: Database["public"]["Enums"]["dependency_type"]
        }
        Update: {
          created_at?: string
          depends_on_task_id?: string
          task_id?: string
          type?: Database["public"]["Enums"]["dependency_type"]
        }
        Relationships: []
      }
      task_followers: {
        Row: { task_id: string; user_id: string }
        Insert: { task_id: string; user_id: string }
        Update: { task_id?: string; user_id?: string }
        Relationships: []
      }
      task_likes: {
        Row: { created_at: string; task_id: string; user_id: string }
        Insert: { created_at?: string; task_id: string; user_id: string }
        Update: { created_at?: string; task_id?: string; user_id?: string }
        Relationships: []
      }
      task_projects: {
        Row: {
          position: number
          project_id: string
          section_id: string | null
          task_id: string
        }
        Insert: {
          position?: number
          project_id: string
          section_id?: string | null
          task_id: string
        }
        Update: {
          position?: number
          project_id?: string
          section_id?: string | null
          task_id?: string
        }
        Relationships: []
      }
      task_tags: {
        Row: { tag_id: string; task_id: string }
        Insert: { tag_id: string; task_id: string }
        Update: { tag_id?: string; task_id?: string }
        Relationships: []
      }
      tasks: {
        Row: {
          assignee_id: string | null
          completed: boolean
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          due_date: string | null
          due_time: string | null
          id: string
          is_milestone: boolean
          name: string
          notes: string | null
          parent_task_id: string | null
          position: number
          priority: Database["public"]["Enums"]["task_priority"] | null
          start_date: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          assignee_id?: string | null
          completed?: boolean
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          due_time?: string | null
          id?: string
          is_milestone?: boolean
          name: string
          notes?: string | null
          parent_task_id?: string | null
          position?: number
          priority?: Database["public"]["Enums"]["task_priority"] | null
          start_date?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          assignee_id?: string | null
          completed?: boolean
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          due_time?: string | null
          id?: string
          is_milestone?: boolean
          name?: string
          notes?: string | null
          parent_task_id?: string | null
          position?: number
          priority?: Database["public"]["Enums"]["task_priority"] | null
          start_date?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
      team_members: {
        Row: { role: string; team_id: string; user_id: string }
        Insert: { role?: string; team_id: string; user_id: string }
        Update: { role?: string; team_id?: string; user_id?: string }
        Relationships: []
      }
      teams: {
        Row: {
          color: string | null
          created_at: string
          created_by: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
          workspace_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          workspace_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          workspace_id?: string
        }
        Relationships: []
      }
      workspace_members: {
        Row: {
          joined_at: string
          role: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          joined_at?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Update: {
          joined_at?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: []
      }
      workspaces: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          logo_url: string | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          logo_url?: string | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      can_access_project: { Args: { p_id: string }; Returns: boolean }
      is_workspace_member: { Args: { ws_id: string }; Returns: boolean }
      workspace_of_task: { Args: { t_id: string }; Returns: string }
      workspace_role_of: {
        Args: { ws_id: string }
        Returns: Database["public"]["Enums"]["workspace_role"]
      }
    }
    Enums: {
      automation_action:
        | "move_to_section"
        | "set_assignee"
        | "set_custom_field"
        | "add_comment"
        | "set_due_date"
        | "notify_user"
        | "add_tag"
      automation_trigger:
        | "task_added_to_section"
        | "task_completed"
        | "task_created"
        | "due_date_arrives"
        | "custom_field_changed"
        | "assignee_changed"
      custom_field_type:
        | "text"
        | "number"
        | "single_select"
        | "multi_select"
        | "date"
        | "people"
        | "checkbox"
      dependency_type: "blocking" | "waiting_on"
      goal_status:
        | "on_track"
        | "at_risk"
        | "off_track"
        | "not_started"
        | "achieved"
        | "missed"
      notification_type:
        | "assigned"
        | "mentioned"
        | "comment"
        | "due_soon"
        | "completed"
        | "status_change"
        | "added_to_project"
        | "dependency_cleared"
      project_privacy: "public" | "private"
      project_role: "owner" | "editor" | "commenter" | "viewer"
      project_status: "on_track" | "at_risk" | "off_track" | "on_hold" | "complete"
      task_priority: "low" | "medium" | "high"
      workspace_role: "owner" | "admin" | "member" | "guest"
    }
    CompositeTypes: { [_ in never]: never }
  }
}

type PublicSchema = Database["public"]

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"]
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T]
