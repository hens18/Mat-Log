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
      competitions: {
        Row: {
          created_at: string;
          id: string;
          location: string | null;
          name: string;
          notes: string | null;
          starts_on: string;
          updated_at: string;
          user_id: string;
          weigh_in_at: string | null;
          weight_class: number | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          location?: string | null;
          name: string;
          notes?: string | null;
          starts_on: string;
          updated_at?: string;
          user_id?: string;
          weigh_in_at?: string | null;
          weight_class?: number | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          location?: string | null;
          name?: string;
          notes?: string | null;
          starts_on?: string;
          updated_at?: string;
          user_id?: string;
          weigh_in_at?: string | null;
          weight_class?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'competitions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      custom_foods: {
        Row: {
          brand: string | null;
          calories: number;
          carbs_g: number | null;
          created_at: string;
          fat_g: number | null;
          id: string;
          micros: Json | null;
          name: string;
          protein_g: number | null;
          serving_grams: number | null;
          serving_label: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          brand?: string | null;
          calories: number;
          carbs_g?: number | null;
          created_at?: string;
          fat_g?: number | null;
          id?: string;
          micros?: Json | null;
          name: string;
          protein_g?: number | null;
          serving_grams?: number | null;
          serving_label: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          brand?: string | null;
          calories?: number;
          carbs_g?: number | null;
          created_at?: string;
          fat_g?: number | null;
          id?: string;
          micros?: Json | null;
          name?: string;
          protein_g?: number | null;
          serving_grams?: number | null;
          serving_label?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'custom_foods_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      favorite_foods: {
        Row: {
          created_at: string;
          food_key: string;
          id: string;
          item: NonNullable<Json>;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          food_key: string;
          id?: string;
          item: NonNullable<Json>;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          food_key?: string;
          id?: string;
          item?: NonNullable<Json>;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'favorite_foods_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      food_logs: {
        Row: {
          brand: string | null;
          calories: number;
          carbs_g: number | null;
          created_at: string;
          fat_g: number | null;
          id: string;
          logged_on: string;
          meal: Database['public']['Enums']['meal_type'];
          micros: Json | null;
          name: string;
          protein_g: number | null;
          serving_label: string | null;
          servings: number;
          source: Database['public']['Enums']['food_source'];
          source_id: string | null;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          brand?: string | null;
          calories: number;
          carbs_g?: number | null;
          created_at?: string;
          fat_g?: number | null;
          id?: string;
          logged_on?: string;
          meal: Database['public']['Enums']['meal_type'];
          micros?: Json | null;
          name: string;
          protein_g?: number | null;
          serving_label?: string | null;
          servings?: number;
          source?: Database['public']['Enums']['food_source'];
          source_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          brand?: string | null;
          calories?: number;
          carbs_g?: number | null;
          created_at?: string;
          fat_g?: number | null;
          id?: string;
          logged_on?: string;
          meal?: Database['public']['Enums']['meal_type'];
          micros?: Json | null;
          name?: string;
          protein_g?: number | null;
          serving_label?: string | null;
          servings?: number;
          source?: Database['public']['Enums']['food_source'];
          source_id?: string | null;
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
      hydration_logs: {
        Row: {
          created_at: string;
          id: string;
          logged_at: string;
          name: string;
          potassium_mg: number;
          practice_id: string;
          sodium_mg: number;
          user_id: string;
          volume_ml: number;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          logged_at?: string;
          name: string;
          potassium_mg?: number;
          practice_id: string;
          sodium_mg?: number;
          user_id?: string;
          volume_ml: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          logged_at?: string;
          name?: string;
          potassium_mg?: number;
          practice_id?: string;
          sodium_mg?: number;
          user_id?: string;
          volume_ml?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'hydration_logs_practice_id_fkey';
            columns: ['practice_id'];
            isOneToOne: false;
            referencedRelation: 'practices';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'hydration_logs_user_id_fkey';
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
          fluid_during_ml: number | null;
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
          fluid_during_ml?: number | null;
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
          fluid_during_ml?: number | null;
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
          birth_year: number | null;
          calorie_goal: number | null;
          created_at: string;
          display_name: string | null;
          goal_weight: number | null;
          hydration_reminders: boolean;
          id: string;
          sex: Database['public']['Enums']['biological_sex'] | null;
          updated_at: string;
          weight_class: number | null;
          weight_unit: Database['public']['Enums']['weight_unit'];
        };
        ComputedFields: never;
        Insert: {
          birth_year?: number | null;
          calorie_goal?: number | null;
          created_at?: string;
          display_name?: string | null;
          goal_weight?: number | null;
          hydration_reminders?: boolean;
          id: string;
          sex?: Database['public']['Enums']['biological_sex'] | null;
          updated_at?: string;
          weight_class?: number | null;
          weight_unit?: Database['public']['Enums']['weight_unit'];
        };
        Update: {
          birth_year?: number | null;
          calorie_goal?: number | null;
          created_at?: string;
          display_name?: string | null;
          goal_weight?: number | null;
          hydration_reminders?: boolean;
          id?: string;
          sex?: Database['public']['Enums']['biological_sex'] | null;
          updated_at?: string;
          weight_class?: number | null;
          weight_unit?: Database['public']['Enums']['weight_unit'];
        };
        Relationships: [];
      };
      saved_meals: {
        Row: {
          created_at: string;
          id: string;
          items: NonNullable<Json>;
          name: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          items: NonNullable<Json>;
          name: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          items?: NonNullable<Json>;
          name?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'saved_meals_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
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
      convert_weight_unit: {
        Args: { target: Database['public']['Enums']['weight_unit'] };
        Returns: undefined;
      };
      delete_my_account: { Args: Record<PropertyKey, never>; Returns: undefined };
    };
    Enums: {
      biological_sex: 'male' | 'female';
      food_source: 'custom' | 'usda' | 'open_food_facts';
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
      biological_sex: ['male', 'female'],
      food_source: ['custom', 'usda', 'open_food_facts'],
      meal_type: ['breakfast', 'lunch', 'dinner', 'snack'],
      weigh_in_kind: ['morning', 'pre_practice', 'post_practice', 'night'],
      weight_unit: ['lb', 'kg'],
    },
  },
} as const;
