import { ChatCitation } from '../data/types';
import { getEntityPath } from './entityRoutes';

export const getCitationPath = (citation: ChatCitation) => {
  if (citation.entityType === 'document' && citation.entityId) {
    const params = new URLSearchParams();
    if (citation.page) params.set('page', String(citation.page));
    if (citation.quote) params.set('quote', citation.quote);
    const query = params.toString();
    return `/documents/${encodeURIComponent(citation.entityId)}/viewer${
      query ? `?${query}` : ''
    }`;
  }

  if (citation.entityType && citation.entityId) {
    return getEntityPath(citation.entityType, citation.entityId);
  }

  return null;
};
