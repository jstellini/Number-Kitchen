// The recipe book. A recipe is data: which dish it makes and its steps in order, each naming a
// step from steps.js plus that step's details. A new recipe that reuses existing steps needs
// no new code. Every recipe opens with the customer's order, added by App.
const RECIPES = [
  {
    id: 'pizza',
    dish: 'pizza',
    steps: [
      { do: 'mix', vessel: 'bowl', items: ['flour', 'milk', 'egg'] },
      { do: 'stir', tool: 'spoon', into: 'dough' },
      { do: 'roll' },
      { do: 'sauce' },
      { do: 'decorate', items: ['pepperoni', 'mushroom', 'olive', 'basil', 'cheese'] },
      { do: 'bake' },
      { do: 'cut' },
      { do: 'serve' },
    ],
  },
  {
    id: 'cupcakes',
    dish: 'cupcakes',
    steps: [
      { do: 'mix', vessel: 'bowl', items: ['flour', 'sugar', 'egg', 'milk'] },
      { do: 'stir', tool: 'whisk', into: 'batter' },
      { do: 'pour', from: 'jug', color: '#fbe3b0' },
      { do: 'bake' },
      { do: 'frost' },
      { do: 'decorate', items: ['sprinkles', 'cherry', 'strawberry', 'candy', 'blueberry'] },
      { do: 'serve' },
    ],
  },
  {
    id: 'smoothie',
    dish: 'smoothie',
    steps: [
      { do: 'mix', vessel: 'blender', items: ['banana', 'milk', 'strawberry', 'blueberry'] },
      { do: 'blend' },
      { do: 'pour', from: 'blender-jar', color: '#ff8fb1' },
      { do: 'decorate', items: ['straw', 'umbrella', 'orange', 'strawberry', 'mint'] },
      { do: 'serve' },
    ],
  },
];

// The customers. Each is drawn in art.js with an idle and a happy face.
const CUSTOMERS = ['bear', 'bunny', 'cat', 'panda'];
