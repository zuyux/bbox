import { docs } from 'collections/server';
import { loader } from 'fumadocs-core/source';
import { docsI18nConfig } from '@/lib/docs-i18n';

export const docsSource = loader({
  baseUrl: '/documentation',
  source: docs.toFumadocsSource(),
  i18n: docsI18nConfig,
});
