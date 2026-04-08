import 'server-only';

const dictionaries = {
  en: () => import('./locales/en.json').then((module) => module.default),
  es: () => import('./locales/es.json').then((module) => module.default),
};

export type Locale = keyof typeof dictionaries;
export const locales = ['en', 'es'] as const;
export const defaultLocale = 'en';

export const getDictionary = async (locale: string) => {
  if (locale in dictionaries) {
    return dictionaries[locale as Locale]();
  }
  return dictionaries[defaultLocale as Locale]();
};
