const OPTIMIZED_MENU_IMAGES = new Map([
  ['/menu/menu-01.jpeg', '/menu/menu-01.webp'],
  ['/menu/menu-02.jpeg', '/menu/menu-02.webp'],
  ['/menu/menu-04.jpeg', '/menu/menu-04.webp'],
  ['/menu/menu-05.jpeg', '/menu/menu-05.webp'],
  ['/menu/menu-06.jpeg', '/menu/menu-06.webp'],
  ['/menu/menu-07.jpeg', '/menu/menu-07.webp'],
  ['/menu/menu-08.jpeg', '/menu/menu-08.webp'],
  ['/menu/menu-09.jpeg', '/menu/menu-09.webp'],
  ['/menu/menu-10.jpeg', '/menu/menu-10.webp'],
  ['/menu/menu-12.jpeg', '/menu/menu-12.webp'],
  ['/menu/menu-18.jpeg', '/menu/menu-18.webp'],
  ['/menu/pizza/chicken-mushroom.png', '/menu/pizza/chicken-mushroom.webp'],
  ['/menu/pizza/hawaiian.png', '/menu/pizza/hawaiian.webp'],
  ['/menu/pizza/margherita.png', '/menu/pizza/margherita.webp'],
  ['/menu/pizza/pepperoni.png', '/menu/pizza/pepperoni.webp'],
  ['/menu/pizza/spicy.png', '/menu/pizza/spicy.webp'],
]);

export function getOptimizedMenuImageUrl(imageUrl) {
  return OPTIMIZED_MENU_IMAGES.get(imageUrl) || imageUrl;
}
