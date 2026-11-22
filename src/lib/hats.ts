export type HatId =
  | 'none'
  | 'cap'
  | 'bow'
  | 'flower'
  | 'headphones'
  | 'party'
  | 'crown'
  | 'wizard'
  | 'pirate'
  | 'unicorn';

export const HATS: { id: HatId; name: string; price: number }[] = [
  { id: 'none', name: 'Без шапки', price: 0 },
  { id: 'cap', name: 'Кепка', price: 20 },
  { id: 'bow', name: 'Бантик', price: 35 },
  { id: 'flower', name: 'Цветочек', price: 45 },
  { id: 'headphones', name: 'Наушники', price: 60 },
  { id: 'party', name: 'Праздник', price: 75 },
  { id: 'crown', name: 'Корона', price: 100 },
  { id: 'wizard', name: 'Колпак мага', price: 150 },
  { id: 'pirate', name: 'Пират', price: 200 },
  { id: 'unicorn', name: 'Единорог', price: 300 },
];
