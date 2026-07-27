import { docs } from 'collections/server';
import { loader } from 'fumadocs-core/source';

export const docsSource = loader({
  baseUrl: '/documentation',
  source: docs.toFumadocsSource(),
});
