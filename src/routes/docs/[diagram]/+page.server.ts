import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import mediaFlow from '../../../../docs/diagrams/media-flow.html?raw';
import metadataModel from '../../../../docs/diagrams/metadata-model.html?raw';

// Only these repository-owned static documents may supply markup to the page.
const diagrams: Record<string, string> = {
  'media-flow.html': mediaFlow,
  'metadata-model.html': metadataModel,
};

export const load: PageServerLoad = ({ params }) => {
  const source = Object.hasOwn(diagrams, params.diagram) ? diagrams[params.diagram] : null;
  if (!source) error(404, 'Diagram not found');
  return {
    title: source.match(/<h1>(.*?)<\/h1>/s)![1],
    intro: source.match(/<p class="intro">(.*?)<\/p>/s)![1],
    svg: source.match(/<svg[\s\S]*?<\/svg>/)![0],
    notes: source.match(/<div class="notes">(.*?)<\/div>/s)![1],
    footer: source.match(/<footer>(.*?)<\/footer>/s)![1],
  };
};
