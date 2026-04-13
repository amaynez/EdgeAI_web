import 'server-only';
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from '@/lib/locales';

const dictionaries = {
  en: () => import('./locales/en.json').then((module) => module.default),
  es: () => import('./locales/es.json').then((module) => module.default),
};

export type Locale = keyof typeof dictionaries;
export { SUPPORTED_LOCALES as locales, DEFAULT_LOCALE as defaultLocale } from '@/lib/locales';

export const getDictionary = async (locale: string) => {
  if (locale in dictionaries) {
    return dictionaries[locale as Locale]();
  }
  return dictionaries[DEFAULT_LOCALE]();
};
