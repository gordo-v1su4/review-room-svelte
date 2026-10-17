import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import mediaFlow from '../../../../docs/diagrams/media-flow.html?raw';
import metadataModel from '../../../../docs/diagrams/metadata-model.html?raw';

const diagrams: Record<string, string> = {
  'media-flow.html': mediaFlow,
  'metadata-model.html': metadataModel,
};

export const GET: RequestHandler = ({ params }) => {
  const diagram = Object.hasOwn(diagrams, params.diagram) ? diagrams[params.diagram] : null;
  if (!diagram) error(404, 'Diagram not found');
  return new Response(diagram.replace('<nav>', '<nav><a href="/">Workspace</a><a href="/docs">Documentation</a>'), {
    headers: { 'content-type': 'text/html; charset=utf-8', 'x-content-type-options': 'nosniff' },
  });
};
