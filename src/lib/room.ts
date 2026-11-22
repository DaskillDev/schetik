/** Furniture for Счётик's room. `x`/`y` are percentages of the room picture, `size` is the emoji size. */
export const DECOR = [
  { id: 'ball', name: 'Мяч', emoji: '⚽', price: 20, x: 72, y: 84, size: 30 },
  { id: 'plant', name: 'Цветок', emoji: '🪴', price: 25, x: 85, y: 56, size: 42 },
  { id: 'books', name: 'Книжки', emoji: '📚', price: 25, x: 80, y: 16, size: 36 },
  { id: 'teddy', name: 'Мишка', emoji: '🧸', price: 30, x: 25, y: 80, size: 38 },
  { id: 'lamp', name: 'Лампа', emoji: '💡', price: 30, x: 47, y: 0, size: 30 },
  { id: 'picture', name: 'Картина', emoji: '🖼️', price: 35, x: 6, y: 14, size: 44 },
  { id: 'bed', name: 'Кроватка', emoji: '🛏️', price: 60, x: 2, y: 54, size: 60 },
  { id: 'fish', name: 'Рыбка', emoji: '🐠', price: 80, x: 83, y: 36, size: 32 },
  { id: 'guitar', name: 'Гитара', emoji: '🎸', price: 90, x: 66, y: 52, size: 38 },
  { id: 'telescope', name: 'Телескоп', emoji: '🔭', price: 120, x: 24, y: 48, size: 38 },
  { id: 'rainbow', name: 'Радуга в окне', emoji: '🌈', price: 150, x: 42, y: 14, size: 40 },
  { id: 'rocket', name: 'Ракета', emoji: '🚀', price: 200, x: 8, y: 34, size: 32 },
] as const;

export type DecorId = (typeof DECOR)[number]['id'];

export const WALLPAPERS = [
  { id: 'peach', name: 'Персик', wall: '#FFE9D2', floor: '#E2B88E', price: 0 },
  { id: 'sky', name: 'Небо', wall: '#D6ECFF', floor: '#BFA07C', price: 50 },
  { id: 'mint', name: 'Мята', wall: '#D5F5E3', floor: '#C79F78', price: 50 },
  { id: 'lavender', name: 'Лаванда', wall: '#EADCFF', floor: '#B99A7B', price: 70 },
  { id: 'night', name: 'Звёздная ночь', wall: '#2E3A6E', floor: '#5D4B70', price: 150 },
] as const;

export type WallpaperId = (typeof WALLPAPERS)[number]['id'];
