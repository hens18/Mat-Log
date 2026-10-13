export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      food_logs: {
        Row: {
          calories: number;
          carbs_g: number | null;
          created_at: string;
          fat_g: number | null;
          id: string;
          logged_on: string;
          meal: Database['public']['Enums']['meal_type'];
          name: string;
          protein_g: number | null;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          calories: number;
          carbs_g?: number | null;
          created_at?: string;
          fat_g?: number | null;
          id?: string;
          logged_on?: string;
          meal: Database['public']['Enums']['meal_type'];
          name: string;
          protein_g?: number | null;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          calories?: number;
          carbs_g?: number | null;
          created_at?: string;
          fat_g?: number | null;
          id?: string;
          logged_on?: string;
          meal?: Database['public']['Enums']['meal_type'];
          name?: string;
          protein_g?: number | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'food_logs_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      practice_reflections: {
        Row: {
          created_at: string;
          energy: number | null;
          focus_next: string | null;
          id: string;
          practice_id: string;
          to_improve: string | null;
          updated_at: string;
          user_id: string;
          went_well: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          energy?: number | null;
          focus_next?: string | null;
          id?: string;
          practice_id: string;
          to_improve?: string | null;
          updated_at?: string;
          user_id?: string;
          went_well?: string | null;
        };
        Update: {
          created_at?: string;
          energy?: number | null;
          focus_next?: string | null;
          id?: string;
          practice_id?: string;
          to_improve?: string | null;
          updated_at?: string;
          user_id?: string;
          went_well?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'practice_reflections_practice_id_fkey';
            columns: ['practice_id'];
            isOneToOne: true;
            referencedRelation: 'practices';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'practice_reflections_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      practices: {
        Row: {
          created_at: string;
          duration_minutes: number | null;
          id: string;
          intensity: number | null;
          notes: string | null;
          post_weight: number | null;
          practice_date: string;
          pre_weight: number | null;
          updated_at: string;
          user_id: string;
          weight_lost: number | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          duration_minutes?: number | null;
          id?: string;
          intensity?: number | null;
          notes?: string | null;
          post_weight?: number | null;
          practice_date?: string;
          pre_weight?: number | null;
          updated_at?: string;
          user_id?: string;
          weight_lost?: never;
        };
        Update: {
          created_at?: string;
          duration_minutes?: number | null;
          id?: string;
          intensity?: number | null;
          notes?: string | null;
          post_weight?: number | null;
          practice_date?: string;
          pre_weight?: number | null;
          updated_at?: string;
          user_id?: string;
          weight_lost?: never;
        };
        Relationships: [
          {
            foreignKeyName: 'practices_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          calorie_goal: number | null;
          created_at: string;
          display_name: string | null;
          goal_weight: number | null;
          id: string;
          updated_at: string;
          weight_class: number | null;
          weight_unit: Database['public']['Enums']['weight_unit'];
        };
        ComputedFields: never;
        Insert: {
          calorie_goal?: number | null;
          created_at?: string;
          display_name?: string | null;
          goal_weight?: number | null;
          id: string;
          updated_at?: string;
          weight_class?: number | null;
          weight_unit?: Database['public']['Enums']['weight_unit'];
        };
        Update: {
          calorie_goal?: number | null;
          created_at?: string;
          display_name?: string | null;
          goal_weight?: number | null;
          id?: string;
          updated_at?: string;
          weight_class?: number | null;
          weight_unit?: Database['public']['Enums']['weight_unit'];
        };
        Relationships: [];
      };
      weigh_ins: {
        Row: {
          created_at: string;
          id: string;
          kind: Database['public']['Enums']['weigh_in_kind'];
          note: string | null;
          recorded_at: string;
          updated_at: string;
          user_id: string;
          weight: number;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          kind: Database['public']['Enums']['weigh_in_kind'];
          note?: string | null;
          recorded_at?: string;
          updated_at?: string;
          user_id?: string;
          weight: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          kind?: Database['public']['Enums']['weigh_in_kind'];
          note?: string | null;
          recorded_at?: string;
          updated_at?: string;
          user_id?: string;
          weight?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'weigh_ins_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      delete_my_account: { Args: Record<PropertyKey, never>; Returns: undefined };
    };
    Enums: {
      meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
      weigh_in_kind: 'morning' | 'pre_practice' | 'post_practice' | 'night';
      weight_unit: 'lb' | 'kg';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      meal_type: ['breakfast', 'lunch', 'dinner', 'snack'],
      weigh_in_kind: ['morning', 'pre_practice', 'post_practice', 'night'],
      weight_unit: ['lb', 'kg'],
    },
  },
} as const;
