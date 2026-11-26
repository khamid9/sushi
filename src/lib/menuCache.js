export const MENU_CACHE_KEY = 'sushi-menu-cache-v1';

export function invalidateMenuCache() {
  try {
    localStorage.removeItem(MENU_CACHE_KEY);
  } catch (error) {
    console.warn('Could not invalidate the cached menu', error);
  }
}
