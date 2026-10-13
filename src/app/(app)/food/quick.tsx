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

type Params = {
  meal?: string;
  date?: string;
  name?: string;
  calories?: string;
  protein?: string;
  carbs?: string;
  fat?: string;
};

/** Manual entry: type in a food's name, calories, and macros. */
export default function QuickAddScreen() {
  const params = useLocalSearchParams<Params>();
  const food = useFoodLogs();
  const createFood = useCreateFoodLog();
  const recents = useMemo(() => recentFoods(food.data ?? []), [food.data]);

  const dateKey =
    params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : toDateKey(new Date());
  const [initialValues] = useState<FoodFormValues>(() => ({
    name: params.name ?? '',
    calories: params.calories ?? '',
    protein: params.protein ?? '',
    carbs: params.carbs ?? '',
    fat: params.fat ?? '',
    meal: MEALS.includes(params.meal as MealType)
      ? (params.meal as MealType)
      : defaultMealForTime(new Date()),
  }));

  return (
    <FoodForm
      initialValues={initialValues}
      dateKey={dateKey}
      recents={params.name ? [] : recents}
      submitLabel="Save food"
      submitting={createFood.isPending}
      onSubmit={async (values) => {
        await createFood.mutateAsync(values);
        notifySuccess('Food logged', `${values.name} · ${values.calories} kcal`);
        router.dismissTo('/fuel');
      }}
    />
  );
}
