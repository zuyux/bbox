import type { I18nConfig } from 'fumadocs-core/i18n';
import { defineI18nUI } from 'fumadocs-ui/i18n';

export const docsI18nConfig = {
  languages: ['en', 'es', 'pt'],
  defaultLanguage: 'en',
  parser: 'dir',
  hideLocale: 'never',
  fallbackLanguage: 'en',
} satisfies I18nConfig<'en' | 'es' | 'pt'>;

export const docsI18n = defineI18nUI(
  docsI18nConfig,
  {
    en: { displayName: 'English' },
    es: {
      displayName: 'Español',
      'Choose a language(language switcher)': 'Elegir idioma',
      'Search(search dialog)': 'Buscar',
      'Search(search trigger)': 'Buscar',
      'No results found(search dialog)': 'No se encontraron resultados',
      'On this page(table of contents)': 'En esta página',
      'Next Page(pagination)': 'Página siguiente',
      'Previous Page(pagination)': 'Página anterior',
    },
    pt: {
      displayName: 'Português',
      'Choose a language(language switcher)': 'Escolher idioma',
      'Search(search dialog)': 'Pesquisar',
      'Search(search trigger)': 'Pesquisar',
      'No results found(search dialog)': 'Nenhum resultado encontrado',
      'On this page(table of contents)': 'Nesta página',
      'Next Page(pagination)': 'Próxima página',
      'Previous Page(pagination)': 'Página anterior',
    },
  },
);
