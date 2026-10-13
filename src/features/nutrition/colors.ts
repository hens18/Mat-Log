import type { MealType } from './summary';

// Macro colors borrow the pink / amber / green palette from the health
// reference designs.
export const MACRO_COLORS = {
  protein: '#F27BA8',
  carbs: '#F5B841',
  fat: '#3FB27F',
} as const;

export const MEAL_COLORS: Record<MealType, string> = {
  breakfast: '#F5B841',
  lunch: '#3FB27F',
  dinner: '#5B9DFF',
  snack: '#F27BA8',
};

export const MEAL_ICONS = {
  breakfast: 'sunny',
  lunch: 'restaurant',
  dinner: 'moon',
  snack: 'cafe',
} as const;
