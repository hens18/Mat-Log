import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';

import { FoodForm, type FoodFormValues } from '@/features/nutrition/components/FoodForm';
import { useCreateFoodLog, useFoodLogs } from '@/features/nutrition/hooks';
import {
  MEALS,
  defaultMealForTime,
  recentFoods,
  type MealType,
} from '@/features/nutrition/summary';
import { toDateKey } from '@/utils/dates';
import { notifySuccess } from '@/utils/notify';

export default function NewFoodScreen() {
  const params = useLocalSearchParams<{ meal?: string; date?: string }>();
  const food = useFoodLogs();
  const createFood = useCreateFoodLog();
  const recents = useMemo(() => recentFoods(food.data ?? []), [food.data]);

  const dateKey =
    params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : toDateKey(new Date());
  const [initialValues] = useState<FoodFormValues>(() => ({
    name: '',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    meal: MEALS.includes(params.meal as MealType)
      ? (params.meal as MealType)
      : defaultMealForTime(new Date()),
  }));

  return (
    <FoodForm
      initialValues={initialValues}
      dateKey={dateKey}
      recents={recents}
      submitLabel="Save food"
      submitting={createFood.isPending}
      onSubmit={async (values) => {
        await createFood.mutateAsync(values);
        notifySuccess('Food logged', `${values.name} · ${values.calories} kcal`);
        router.back();
      }}
    />
  );
}
