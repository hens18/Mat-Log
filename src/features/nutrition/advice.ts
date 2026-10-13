// What to eat when a nutrient runs low, or what to cut back on when one runs
// high. Food amounts come from the NIH Office of Dietary Supplements fact
// sheets and USDA FoodData Central, rounded.

import type { MicroKey } from './micros';

export type NutrientAdvice = {
  /** Why it matters, in a sentence. */
  why: string;
  /** Good sources with a typical amount per serving. */
  foods: string[];
  /** A practical tip. */
  tip: string;
};

export const LOW_ADVICE: Partial<Record<MicroKey, NutrientAdvice>> = {
  fiber: {
    why: 'Keeps digestion regular and energy steady between meals.',
    foods: [
      'Lentils, 1 cup cooked: 15 g',
      'Black beans, 1 cup: 15 g',
      'Raspberries, 1 cup: 8 g',
      'Pear, 1 medium: 6 g',
      'Oatmeal, 1 cup cooked: 4 g',
    ],
    tip: 'Add fiber a little at a time and drink more water with it. Keep big high-fiber meals away from the hours right before you compete, since they can sit heavy.',
  },
  potassium: {
    why: 'Helps muscles contract and replaces what you lose in sweat.',
    foods: [
      'Lentils, 1 cup cooked: 730 mg',
      'Potato, 1 medium baked: 610 mg',
      'Kidney beans, 1 cup: 610 mg',
      'Orange juice, 1 cup: 500 mg',
      'Banana, 1 medium: 420 mg',
      'Plain yogurt, 6 oz: 330 mg',
    ],
    tip: 'Most people fall short here. A potato or a banana with a meal and a glass of milk or orange juice closes a lot of the gap.',
  },
  calcium: {
    why: 'Builds and protects bones, which matters most when you train hard and eat less.',
    foods: [
      'Plain low-fat yogurt, 8 oz: 415 mg',
      'Fortified orange juice, 1 cup: 350 mg',
      'Mozzarella, 1.5 oz: 330 mg',
      'Milk, 1 cup: 300 mg',
      'Fortified soy milk, 1 cup: 300 mg',
      'Firm tofu made with calcium, 1/2 cup: 250 mg',
    ],
    tip: 'Your body absorbs calcium best in amounts of about 500 mg or less at a time, so spread it over meals. Vitamin D helps you absorb it.',
  },
  iron: {
    why: 'Carries oxygen to your muscles. Low iron shows up as fatigue and slow recovery, and female athletes are at higher risk.',
    foods: [
      'Fortified breakfast cereal, 1 serving: up to 18 mg',
      'White beans, 1 cup: 8 mg',
      'Lentils, 1/2 cup cooked: 3 mg',
      'Spinach, 1/2 cup cooked: 3 mg',
      'Firm tofu, 1/2 cup: 3 mg',
      'Lean beef, 3 oz: 2 mg',
    ],
    tip: 'Eat plant sources of iron with vitamin C (citrus, peppers, strawberries) to absorb more. Coffee and tea with meals cut absorption.',
  },
  magnesium: {
    why: 'Involved in muscle and nerve function and turning food into energy.',
    foods: [
      'Pumpkin seeds, 1 oz: 155 mg',
      'Chia seeds, 1 oz: 110 mg',
      'Almonds, 1 oz: 80 mg',
      'Spinach, 1/2 cup cooked: 80 mg',
      'Black beans, 1/2 cup: 60 mg',
      'Peanut butter, 2 tbsp: 50 mg',
    ],
    tip: 'A handful of nuts or seeds as a snack is the easiest fix.',
  },
  zinc: {
    why: 'Supports immune function and skin healing, handy with mat burns and whatever is going around the room.',
    foods: [
      'Beef patty, 3 oz: 5 mg',
      'Beef sirloin, 3 oz: 4 mg',
      'Pork chop, 3 oz: 3 mg',
      'Baked beans, 1/2 cup: 3 mg',
      'Fortified cereal, 1 serving: 3 mg',
      'Pumpkin seeds, 1 oz: 2 mg',
    ],
    tip: 'Meat, poultry, and seafood are the best absorbed sources. Vegetarians may need about half again as much.',
  },
  vitaminA: {
    why: 'Supports vision, immunity, and healthy skin.',
    foods: [
      'Sweet potato, 1 baked: 1,400 µg',
      'Spinach, 1/2 cup cooked: 570 µg',
      'Carrots, 1/2 cup raw: 460 µg',
      'Milk, 1 cup: 150 µg',
      'Cantaloupe, 1/2 cup: 135 µg',
      'Red bell pepper, 1/2 cup: 115 µg',
    ],
    tip: 'Orange and dark green vegetables are the richest sources. One sweet potato covers more than a day.',
  },
  vitaminC: {
    why: 'Helps repair tissue and absorb iron from plant foods.',
    foods: [
      'Red bell pepper, 1/2 cup raw: 95 mg',
      'Orange juice, 3/4 cup: 93 mg',
      'Orange, 1 medium: 70 mg',
      'Kiwi, 1 medium: 64 mg',
      'Broccoli, 1/2 cup cooked: 51 mg',
      'Strawberries, 1/2 cup: 49 mg',
    ],
    tip: 'One piece of fruit or a handful of raw peppers a day usually covers it.',
  },
  vitaminD: {
    why: 'Helps you absorb calcium and supports bones and muscles. Indoor athletes often run low in winter.',
    foods: [
      'Rainbow trout, 3 oz: 16 µg',
      'Sockeye salmon, 3 oz: 14 µg',
      'UV-exposed mushrooms, 1/2 cup: 9 µg',
      'Fortified milk, 1 cup: 3 µg',
      'Fortified soy or almond milk, 1 cup: 2 to 4 µg',
      'Egg, 1 large: 1 µg',
    ],
    tip: 'Few foods have much vitamin D, and many food labels leave it out, so it often looks low here. A blood test is the only way to know if you are actually low; ask a doctor before starting a supplement.',
  },
  vitaminB12: {
    why: 'Needed to make red blood cells and keep energy up.',
    foods: [
      'Clams, 3 oz: 84 µg',
      'Fortified nutritional yeast, 1 serving: 8 µg',
      'Salmon, 3 oz: 2.6 µg',
      'Canned tuna, 3 oz: 2.5 µg',
      'Ground beef, 3 oz: 2.4 µg',
      'Milk, 1 cup: 1.3 µg',
    ],
    tip: 'B12 comes almost entirely from animal foods. Vegetarians and vegans need fortified foods or a supplement.',
  },
};

export const HIGH_ADVICE: Partial<Record<MicroKey, NutrientAdvice>> = {
  sodium: {
    why: 'High sodium raises blood pressure over time and makes the scale jump with water.',
    foods: ['Bread and rolls', 'Deli meats', 'Pizza', 'Canned soup', 'Restaurant and fast food'],
    tip: "These are the biggest sources for most people. Compare labels and pick lower-sodium versions. You do lose sodium in sweat, so don't cut it drastically without talking to your athletic trainer.",
  },
  saturatedFat: {
    why: 'Too much raises LDL cholesterol.',
    foods: ['Fatty cuts of meat', 'Butter', 'Cheese', 'Fried food', 'Baked desserts'],
    tip: 'Swap in lean meat and poultry, low-fat dairy, and olive or canola oil instead of butter.',
  },
  cholesterol: {
    why: 'Mostly comes along with saturated fat in animal foods.',
    foods: ['Egg yolks', 'Shrimp', 'Organ meats', 'Fatty meats'],
    tip: 'Current guidelines focus on saturated fat more than cholesterol, so start there.',
  },
};
