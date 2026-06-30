import { MentionableEntityType } from '../data/types';

export const getEntityPath = (
  entityType: MentionableEntityType,
  entityId: string,
) => {
  if (entityType === 'material') return `/materials/${entityId}`;
  if (entityType === 'experiment') return `/experiments/${entityId}`;
  if (entityType === 'document') return `/documents/${entityId}`;
  if (entityType === 'data_issue') return `/data-issues#${entityId}`;

  return `/knowledge-graph?focus=${entityId}`;
};
