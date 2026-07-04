import { ChatCitation } from '../../data/types';

export type EvidenceStatus =
  | 'multiple'
  | 'single'
  | 'conflicting'
  | 'insufficient';

const conflictPattern =
  /(противореч|расхожд|несовпад|не совпад|conflict|contradict|discrepan)/i;
const dataIssueConflictPattern =
  /(противореч|расхожд|несовпад|не совпад|тогда как|conflict|contradict|discrepan)/i;

export const evidenceStatusConfig: Record<
  EvidenceStatus,
  {
    label: string;
    color: 'success' | 'info' | 'warning' | 'default';
    accent: string;
    background: string;
    description: string;
  }
> = {
  multiple: {
    label: 'Подтверждено несколькими источниками',
    color: 'success',
    accent: '#66BB6A',
    background: 'rgba(102,187,106,.16)',
    description:
      'Утверждение связано как минимум с двумя независимыми документами.',
  },
  single: {
    label: 'Подтверждено одним источником',
    color: 'info',
    accent: '#29B6F6',
    background: 'rgba(41,182,246,.16)',
    description:
      'Утверждение подтверждается одним документом или одной публикацией.',
  },
  conflicting: {
    label: 'Есть противоречия',
    color: 'warning',
    accent: '#FFB74D',
    background: 'rgba(255,183,77,.17)',
    description:
      'В связанных данных обнаружено расхождение, которое требует проверки.',
  },
  insufficient: {
    label: 'Недостаточно данных',
    color: 'default',
    accent: '#90A4AE',
    background: 'rgba(144,164,174,.14)',
    description:
      'Для надёжного подтверждения утверждения недостаточно доступных фрагментов.',
  },
};

export const getEvidenceStatus = (
  claim: string,
  sources: ChatCitation[],
): EvidenceStatus => {
  const relatedIssues = sources
    .flatMap((source) => source.relatedEntities ?? [])
    .filter((entity) => entity.type === 'data_issue');
  const conflictIssueFound = relatedIssues.some((entity) =>
    dataIssueConflictPattern.test(`${entity.label} ${entity.description}`),
  );

  if (conflictPattern.test(claim) || conflictIssueFound) {
    return 'conflicting';
  }
  const hasEvidence = sources.some(
    (source) => source.quote || (source.url && source.description),
  );
  if (!hasEvidence) return 'insufficient';

  const independentSources = new Set(
    sources
      .map((source) => source.url ?? source.entityId)
      .filter((value): value is string => Boolean(value)),
  );
  return independentSources.size >= 2 ? 'multiple' : 'single';
};

export const sourceHasConflict = (source: ChatCitation) =>
  conflictPattern.test(`${source.quote ?? ''} ${source.description ?? ''}`)
  || (source.relatedEntities ?? [])
    .filter((entity) => entity.type === 'data_issue')
    .some((entity) =>
      dataIssueConflictPattern.test(`${entity.label} ${entity.description}`),
    );
