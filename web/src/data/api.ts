import {
  AskAssistantRequest,
  AskAssistantResponse,
  ChatSummary,
  DataIssueRecord,
  DocumentRecord,
  DocumentExtractionResult,
  ExperimentRecord,
  HomePageData,
  KnowledgeGraphData,
  MaterialRecord,
  MentionableEntity,
  PublishExtractionRequest,
  PublishExtractionResponse,
  ResearchChat,
  SearchKnowledgeResponse,
  UploadDocumentResponse,
} from './types';

const homePageData: HomePageData = {
  stats: [
    {
      id: 'documents',
      label: 'Документы',
      value: '12 480',
      detail: '+126 за неделю',
      icon: 'documents',
    },
    {
      id: 'experiments',
      label: 'Эксперименты',
      value: '3 264',
      detail: '94% со связями',
      icon: 'experiments',
    },
    {
      id: 'materials',
      label: 'Материалы',
      value: '846',
      detail: '38 семейств',
      icon: 'materials',
    },
    {
      id: 'relations',
      label: 'Связи графа',
      value: '28 910',
      detail: '1 204 проверено',
      icon: 'relations',
    },
  ],
  exampleQueries: [
    'Как термообработка влияет на прочность сплава X?',
    'Какие режимы исследовали для никелевых сплавов?',
    'Где результаты экспериментов противоречат друг другу?',
  ],
  recentChats: [
    {
      id: 'heat-treatment',
      title: 'Влияние термообработки на прочность никелевых сплавов',
      date: '2026-06-30T14:20:00Z',
    },
    {
      id: 'alloys-comparison',
      title: 'Сравнение сплавов X и Y',
      date: '2026-06-30T11:40:00Z',
    },
    {
      id: 'laboratory-experiments',
      title: 'Эксперименты лаборатории порошковой металлургии',
      date: '2026-06-29T18:42:00Z',
    },
    {
      id: 'measurement-conflicts',
      title: 'Противоречия в измерениях твёрдости',
      date: '2026-06-28T15:10:00Z',
    },
    {
      id: 'equipment-comparison',
      title: 'Сравнение результатов на разных установках',
      date: '2026-06-27T09:25:00Z',
    },
  ],
  sources: [
    {
      id: 'source-1',
      name: 'Корпус научных статей',
      type: 'PDF / DOCX',
      documents: 8420,
      status: 'indexed',
    },
    {
      id: 'source-2',
      name: 'Каталог экспериментов',
      type: 'XLSX / CSV',
      documents: 3264,
      status: 'indexed',
    },
    {
      id: 'source-3',
      name: 'Справочник оборудования',
      type: 'JSON',
      documents: 796,
      status: 'indexing',
    },
  ],
};

const chats: ResearchChat[] = [
  {
    id: 'heat-treatment',
    title: 'Влияние термообработки на прочность',
    group: 'today',
    messages: [
      {
        id: 'heat-treatment-user-1',
        role: 'user',
        text: 'Как термообработка влияет на прочность сплава X?',
      },
      {
        id: 'heat-treatment-assistant-1',
        role: 'assistant',
        text:
          'Найдено 7 связанных экспериментов. В пяти из них обработка при ' +
          '850 °C в течение двух часов сопровождалась увеличением прочности. ' +
          'Два результата требуют отдельного сравнения из-за различий в составе образцов.',
        citations: [
          {
            id: 'history-citation-exp-142',
            entityId: 'EXP-0142',
            entityType: 'experiment',
            label: 'EXP-0142',
            description: 'Основная серия при 850 °C',
          },
          {
            id: 'history-citation-doc-t17',
            entityId: 'doc-t-2025-17',
            entityType: 'document',
            label: 'Отчёт Т-2025-17',
            description: 'Источник результата',
            page: 18,
          },
        ],
      },
    ],
  },
  {
    id: 'alloys-comparison',
    title: 'Сравнение сплавов X и Y',
    group: 'today',
    messages: [
      {
        id: 'alloys-comparison-user-1',
        role: 'user',
        text: 'Сравни результаты исследований для сплавов X и Y.',
      },
      {
        id: 'alloys-comparison-assistant-1',
        role: 'assistant',
        text:
          'Для сплава X найдено больше экспериментов при высоких температурах, ' +
          'а для сплава Y — больше измерений коррозионной стойкости. Прямое ' +
          'сравнение возможно для четырёх совпадающих режимов.',
        citations: [
          {
            id: 'alloys-citation-x',
            entityId: 'material-x',
            entityType: 'material',
            label: 'Сплав X',
            description: 'Карточка материала',
          },
          {
            id: 'alloys-citation-y',
            entityId: 'material-y',
            entityType: 'material',
            label: 'Сплав Y',
            description: 'Карточка материала',
          },
        ],
      },
    ],
  },
  {
    id: 'laboratory-experiments',
    title: 'Эксперименты лаборатории',
    group: 'yesterday',
    messages: [
      {
        id: 'laboratory-user-1',
        role: 'user',
        text: 'Какие эксперименты проводила лаборатория порошковой металлургии?',
      },
      {
        id: 'laboratory-assistant-1',
        role: 'assistant',
        text:
          'В базе найдено 41 упоминание экспериментов этой лаборатории. ' +
          'Основные направления — спекание порошков и измерение пористости образцов.',
        citations: [
          {
            id: 'laboratory-citation-p12',
            entityId: 'EXP-0176',
            entityType: 'experiment',
            label: 'EXP-0176',
            description: 'Отжиг порошкового образца P-12',
          },
        ],
      },
    ],
  },
  {
    id: 'measurement-conflicts',
    title: 'Противоречия в измерениях',
    group: 'earlier',
    messages: [
      {
        id: 'conflicts-user-1',
        role: 'user',
        text: 'Найди противоречащие друг другу измерения твёрдости.',
      },
      {
        id: 'conflicts-assistant-1',
        role: 'assistant',
        text:
          'Обнаружены четыре потенциально противоречивых результата. ' +
          'В двух случаях использовались разные шкалы твёрдости без указанного пересчёта.',
        citations: [
          {
            id: 'conflicts-citation-issue',
            entityId: 'issue-unit-mismatch',
            entityType: 'data_issue',
            label: 'Несопоставимые единицы твёрдости',
            description: 'Автоматически обнаруженная проблема',
          },
        ],
      },
    ],
  },
  {
    id: 'equipment-comparison',
    title: 'Сравнение результатов на разных установках',
    group: 'earlier',
    messages: [
      {
        id: 'equipment-user-1',
        role: 'user',
        text: 'Сравни результаты, полученные на разных установках.',
      },
      {
        id: 'equipment-assistant-1',
        role: 'assistant',
        text:
          'Найдено шесть серий сопоставимых экспериментов. Для двух серий ' +
          'наблюдается систематическое расхождение, которое может быть связано ' +
          'с различиями в калибровке оборудования.',
        citations: [
          {
            id: 'equipment-citation-vn12',
            entityId: 'equipment-vn12',
            entityType: 'equipment',
            label: 'Печь ВН-12',
            description: 'Установка в графе знаний',
          },
          {
            id: 'equipment-citation-exp142',
            entityId: 'EXP-0142',
            entityType: 'experiment',
            label: 'EXP-0142',
            description: 'Связанная серия испытаний',
          },
        ],
      },
    ],
  },
];

const knowledgeGraphData: KnowledgeGraphData = {
  entities: [
    {
      id: 'material-x',
      type: 'material',
      title: 'Сплав X',
      subtitle: 'Никелевый жаропрочный сплав',
      description:
        'Исследуемый сплав с повышенным содержанием никеля и хрома.',
      position: { x: 460, y: 280 },
      attributes: [
        { name: 'Ni', value: 61.4, unit: '%' },
        { name: 'Cr', value: 18.2, unit: '%' },
        { name: 'Экспериментов', value: 24 },
      ],
      sources: [{ documentId: 'doc-t-2025-17', page: 4 }],
    },
    {
      id: 'material-y',
      type: 'material',
      title: 'Сплав Y',
      subtitle: 'Никель-кобальтовый сплав',
      description: 'Материал для длительной эксплуатации под нагрузкой.',
      position: { x: 1010, y: 80 },
      attributes: [
        { name: 'Экспериментов', value: 2 },
        { name: 'Документов', value: 2 },
      ],
      sources: [{ documentId: 'doc-experiment-catalog-2024' }],
    },
    {
      id: 'material-z',
      type: 'material',
      title: 'Сплав Z',
      subtitle: 'Железоникелевый сплав',
      description: 'Материал для сравнения способов охлаждения.',
      position: { x: 1010, y: 470 },
      attributes: [
        { name: 'Экспериментов', value: 2 },
        { name: 'Документов', value: 2 },
      ],
      sources: [{ documentId: 'doc-z19', page: 2 }],
    },
    {
      id: 'sample-p12',
      type: 'material',
      title: 'Образец P-12',
      subtitle: 'Порошковый композит',
      description: 'Порошковый никелевый образец.',
      position: { x: 720, y: 760 },
      attributes: [{ name: 'Экспериментов', value: 1 }],
      sources: [{ documentId: 'doc-p12-journal', page: 3 }],
    },
    {
      id: 'EXP-0142',
      type: 'experiment',
      title: 'Эксперимент 142',
      subtitle: 'Термообработка образца',
      description:
        'Исследование влияния выдержки при высокой температуре на прочность.',
      position: { x: 130, y: 110 },
      attributes: [
        { name: 'Дата', value: '14.03.2025' },
        { name: 'Образцов', value: 8 },
        { name: 'Статус', value: 'Завершён' },
      ],
      sources: [{ documentId: 'doc-t-2025-17', page: 18 }],
    },
    {
      id: 'EXP-0208',
      type: 'experiment',
      title: 'Эксперимент 208',
      subtitle: 'Повторная серия',
      description:
        'Проверка воспроизводимости результатов на другой установке.',
      position: { x: 790, y: 105 },
      attributes: [
        { name: 'Дата', value: '02.09.2025' },
        { name: 'Образцов', value: 12 },
        { name: 'Статус', value: 'Завершён' },
      ],
      sources: [{ documentId: 'doc-thermal-article', page: 7 }],
    },
    {
      id: 'EXP-0217',
      type: 'experiment',
      title: 'EXP-0217',
      subtitle: 'Выдержка при 950 °C',
      description: 'Эксперимент с противоречивым эффектом на прочность.',
      position: { x: 785, y: -90 },
      attributes: [{ name: 'Эффект', value: -5, unit: '%' }],
      sources: [{ documentId: 'doc-protocol-21v', page: 4 }],
    },
    {
      id: 'EXP-0094',
      type: 'experiment',
      title: 'EXP-0094',
      subtitle: 'Старение сплава Y',
      description: 'Измерение твёрдости после старения.',
      position: { x: 1300, y: 15 },
      attributes: [{ name: 'Эффект', value: 7, unit: 'HRC' }],
      sources: [{ documentId: 'doc-experiment-catalog-2024' }],
    },
    {
      id: 'EXP-0113',
      type: 'experiment',
      title: 'EXP-0113',
      subtitle: 'Испытание ползучести',
      description: 'Длительное испытание сплава Y.',
      position: { x: 1300, y: 165 },
      attributes: [{ name: 'Ползучесть', value: 0.18, unit: '%' }],
      sources: [{ documentId: 'doc-p44-2024', page: 26 }],
    },
    {
      id: 'EXP-0241',
      type: 'experiment',
      title: 'EXP-0241',
      subtitle: 'Закалка в воде',
      description: 'Закалка сплава Z с водяным охлаждением.',
      position: { x: 1300, y: 400 },
      attributes: [{ name: 'Эффект', value: 22, unit: 'HRC' }],
      sources: [{ documentId: 'doc-z19', page: 9 }],
    },
    {
      id: 'EXP-0246',
      type: 'experiment',
      title: 'EXP-0246',
      subtitle: 'Закалка в масле',
      description: 'Закалка сплава Z с масляным охлаждением.',
      position: { x: 1300, y: 545 },
      attributes: [{ name: 'Эффект', value: 16, unit: 'HRC' }],
      sources: [{ documentId: 'doc-z20', page: 11 }],
    },
    {
      id: 'EXP-0176',
      type: 'experiment',
      title: 'EXP-0176',
      subtitle: 'Отжиг образца P-12',
      description: 'Эксперимент по снижению пористости.',
      position: { x: 1030, y: 760 },
      attributes: [{ name: 'Эффект', value: -4.4, unit: 'п.п.' }],
      sources: [{ documentId: 'doc-p12-journal', page: 43 }],
    },
    {
      id: 'regime-850',
      type: 'regime',
      title: '850 °C · 2 часа',
      subtitle: 'Режим термообработки',
      description:
        'Нагрев до 850 °C, выдержка два часа и охлаждение на воздухе.',
      position: { x: 155, y: 330 },
      attributes: [
        { name: 'Температура', value: 850, unit: '°C' },
        { name: 'Выдержка', value: 2, unit: 'ч' },
        { name: 'Охлаждение', value: 'Воздух' },
      ],
      sources: [{ documentId: 'doc-t-2025-17', page: 17 }],
    },
    {
      id: 'property-strength',
      type: 'property',
      title: 'Предел прочности',
      subtitle: '+15% после обработки',
      description:
        'Максимальное напряжение до разрушения образца при растяжении.',
      position: { x: 770, y: 355 },
      attributes: [
        { name: 'До обработки', value: 420, unit: 'МПа' },
        { name: 'После обработки', value: 485, unit: 'МПа' },
        { name: 'Эффект', value: 15, unit: '%' },
      ],
      sources: [{ documentId: 'doc-t-2025-17', page: 18 }],
    },
    {
      id: 'equipment-vn12',
      type: 'equipment',
      title: 'Печь ВН-12',
      subtitle: 'Вакуумная лабораторная печь',
      description:
        'Установка для контролируемой термообработки металлических образцов.',
      position: { x: 80, y: 545 },
      attributes: [
        { name: 'Диапазон', value: '20–1200', unit: '°C' },
        { name: 'Лаборатория', value: 'Лаб. №3' },
      ],
      sources: [{ documentId: 'doc-t-2025-17', page: 6 }],
    },
    {
      id: 'team-lab-3',
      type: 'team',
      title: 'Лаборатория №3',
      subtitle: 'Порошковая металлургия',
      description:
        'Исследовательская команда, проводившая основную серию экспериментов.',
      position: { x: 365, y: 560 },
      attributes: [
        { name: 'Сотрудников', value: 7 },
        { name: 'Экспериментов', value: 41 },
      ],
      sources: [{ documentId: 'doc-t-2025-17', page: 2 }],
    },
    {
      id: 'doc-t-2025-17',
      type: 'document',
      title: 'Отчёт Т-2025-17',
      subtitle: 'Технический отчёт · 34 страницы',
      description:
        'Отчёт о проведении термических испытаний и измерении прочности.',
      position: { x: 650, y: 570 },
      attributes: [
        { name: 'Год', value: 2025 },
        { name: 'Формат', value: 'PDF' },
        { name: 'Фактов извлечено', value: 38 },
      ],
      sources: [{ documentId: 'doc-t-2025-17' }],
    },
    {
      id: 'conclusion-strength',
      type: 'conclusion',
      title: 'Вывод о прочности',
      subtitle: 'Подтверждён двумя сериями',
      description:
        'Выбранный режим повышает предел прочности при сохранении пластичности.',
      position: { x: 1020, y: 310 },
      attributes: [
        { name: 'Уверенность', value: 'Высокая' },
        { name: 'Источников', value: 3 },
      ],
      sources: [{ documentId: 'doc-t-2025-17', page: 31 }],
    },
    {
      id: 'unclassified-vickers-method',
      type: 'unclassified',
      title: 'Метод Виккерса',
      subtitle: 'Тип сущности не определён',
      description:
        'Сущность извлечена из документа, но не отнесена к фиксированному типу.',
      position: { x: 395, y: -105 },
      attributes: [
        {
          name: 'Контекст',
          value: 'Использован для измерения твёрдости',
        },
      ],
      sources: [{ documentId: 'doc-t-2025-17', page: 12 }],
    },
  ],
  connections: [
    {
      id: 'connection-1',
      source: 'material-x',
      target: 'EXP-0142',
      label: 'исследован в',
    },
    {
      id: 'connection-2',
      source: 'material-x',
      target: 'EXP-0208',
      label: 'исследован в',
    },
    {
      id: 'connection-3',
      source: 'EXP-0142',
      target: 'regime-850',
      label: 'применяет режим',
    },
    {
      id: 'connection-4',
      source: 'EXP-0208',
      target: 'property-strength',
      label: 'измеряет',
    },
    {
      id: 'connection-5',
      source: 'regime-850',
      target: 'property-strength',
      label: 'влияет на',
    },
    {
      id: 'connection-6',
      source: 'EXP-0142',
      target: 'equipment-vn12',
      label: 'проведён на',
    },
    {
      id: 'connection-7',
      source: 'EXP-0142',
      target: 'team-lab-3',
      label: 'выполнен командой',
    },
    {
      id: 'connection-8',
      source: 'EXP-0208',
      target: 'doc-t-2025-17',
      label: 'описан в',
    },
    {
      id: 'connection-9',
      source: 'property-strength',
      target: 'conclusion-strength',
      label: 'подтверждает',
    },
    {
      id: 'connection-10',
      source: 'doc-t-2025-17',
      target: 'conclusion-strength',
      label: 'содержит',
    },
    {
      id: 'connection-11',
      source: 'material-x',
      target: 'EXP-0217',
      label: 'исследован в',
    },
    {
      id: 'connection-12',
      source: 'material-y',
      target: 'EXP-0094',
      label: 'исследован в',
    },
    {
      id: 'connection-13',
      source: 'material-y',
      target: 'EXP-0113',
      label: 'исследован в',
    },
    {
      id: 'connection-14',
      source: 'material-z',
      target: 'EXP-0241',
      label: 'исследован в',
    },
    {
      id: 'connection-15',
      source: 'material-z',
      target: 'EXP-0246',
      label: 'исследован в',
    },
    {
      id: 'connection-16',
      source: 'sample-p12',
      target: 'EXP-0176',
      label: 'исследован в',
    },
    {
      id: 'connection-17',
      source: 'EXP-0142',
      target: 'unclassified-vickers-method',
      label: 'использует',
    },
  ],
};

const knowledgeGraphPreviewEntityIds = new Set([
  'material-x',
  'EXP-0142',
  'EXP-0208',
  'regime-850',
  'property-strength',
  'doc-t-2025-17',
  'conclusion-strength',
  'unclassified-vickers-method',
]);

const experiments: ExperimentRecord[] = [
  {
    id: 'EXP-0142',
    title: 'Термообработка образцов сплава X',
    materialId: 'material-x',
    material: 'Сплав X',
    materialDetails: 'Ni 61,4% · Cr 18,2% · Fe 12,1%',
    temperature: 850,
    duration: '2 часа',
    coolingMethod: 'На воздухе',
    property: 'Предел прочности',
    valueBefore: '420 МПа',
    valueAfter: '485 МПа',
    effect: '+15%',
    equipmentId: 'equipment-vn12',
    equipment: 'Печь ВН-12',
    teamId: 'team-lab-3',
    team: 'Лаборатория №3',
    date: '2025-03-14',
    sourceDocumentId: 'doc-t-2025-17',
    sourceName: 'Отчёт Т-2025-17',
    sourcePage: 18,
    confidence: 0.96,
    notes:
      'Значение подтверждено таблицей результатов и выводом технического отчёта.',
  },
  {
    id: 'EXP-0208',
    title: 'Повторная серия испытаний сплава X',
    materialId: 'material-x',
    material: 'Сплав X',
    materialDetails: 'Ni 61,1% · Cr 18,4% · Fe 12,0%',
    temperature: 850,
    duration: '2 часа',
    coolingMethod: 'На воздухе',
    property: 'Предел прочности',
    valueBefore: '425 МПа',
    valueAfter: '476 МПа',
    effect: '+12%',
    equipmentId: 'equipment-vn18',
    equipment: 'Печь ВН-18',
    teamId: 'team-lab-3',
    team: 'Лаборатория №3',
    date: '2025-09-02',
    sourceDocumentId: 'doc-thermal-article',
    sourceName: 'Статья «Термические режимы…»',
    sourcePage: 7,
    confidence: 0.91,
    notes:
      'Повторная серия подтверждает направление эффекта, но показывает меньший прирост.',
  },
  {
    id: 'EXP-0217',
    title: 'Высокотемпературная выдержка сплава X',
    materialId: 'material-x',
    material: 'Сплав X',
    materialDetails: 'Состав образца указан частично',
    temperature: 950,
    duration: '1 час',
    coolingMethod: 'В печи',
    property: 'Предел прочности',
    valueBefore: '430 МПа',
    valueAfter: '408 МПа',
    effect: '−5%',
    equipmentId: 'equipment-vn18',
    equipment: 'Печь ВН-18',
    teamId: 'team-lab-5',
    team: 'Лаборатория №5',
    date: '2025-10-11',
    sourceDocumentId: 'doc-protocol-21v',
    sourceName: 'Протокол испытаний 21-В',
    sourcePage: 4,
    confidence: 0.78,
    notes:
      'Результат противоречит основной серии. Необходимо проверить состав и скорость охлаждения.',
  },
  {
    id: 'EXP-0094',
    title: 'Старение никелевого сплава Y',
    materialId: 'material-y',
    material: 'Сплав Y',
    materialDetails: 'Ni 58,7% · Cr 20,3% · Co 9,6%',
    temperature: 760,
    duration: '8 часов',
    coolingMethod: 'На воздухе',
    property: 'Твёрдость',
    valueBefore: '31 HRC',
    valueAfter: '38 HRC',
    effect: '+7 HRC',
    equipmentId: 'equipment-snol6',
    equipment: 'Печь СНОЛ-6',
    teamId: 'team-material-center',
    team: 'Центр материаловедения',
    date: '2024-08-22',
    sourceDocumentId: 'doc-experiment-catalog-2024',
    sourceName: 'Каталог экспериментов 2024',
    sourcePage: 112,
    confidence: 0.98,
    notes: 'Запись импортирована из структурированного каталога.',
  },
  {
    id: 'EXP-0113',
    title: 'Испытание ползучести сплава Y',
    materialId: 'material-y',
    material: 'Сплав Y',
    materialDetails: 'Ni 58,7% · Cr 20,3% · Co 9,6%',
    temperature: 700,
    duration: '120 часов',
    coolingMethod: 'Не указан',
    property: 'Ползучесть',
    valueBefore: '—',
    valueAfter: '0,18%',
    effect: '0,18%',
    equipmentId: 'equipment-pv4',
    equipment: 'Установка ПВ-4',
    teamId: 'team-material-center',
    team: 'Центр материаловедения',
    date: '2024-11-09',
    sourceDocumentId: 'doc-p44-2024',
    sourceName: 'Отчёт П-44/2024',
    sourcePage: 26,
    confidence: 0.72,
    notes:
      'В документе отсутствуют сведения о способе охлаждения и исходном состоянии образца.',
  },
  {
    id: 'EXP-0241',
    title: 'Закалка сплава Z в воде',
    materialId: 'material-z',
    material: 'Сплав Z',
    materialDetails: 'Fe 66,2% · Ni 17,4% · Cr 11,8%',
    temperature: 900,
    duration: '40 минут',
    coolingMethod: 'В воде',
    property: 'Твёрдость',
    valueBefore: '24 HRC',
    valueAfter: '46 HRC',
    effect: '+22 HRC',
    equipmentId: 'equipment-vn12',
    equipment: 'Печь ВН-12',
    teamId: 'team-lab-3',
    team: 'Лаборатория №3',
    date: '2026-01-17',
    sourceDocumentId: 'doc-z19',
    sourceName: 'Протокол Z-19',
    sourcePage: 9,
    confidence: 0.94,
    notes: 'Режим и результат подтверждены двумя таблицами измерений.',
  },
  {
    id: 'EXP-0246',
    title: 'Закалка сплава Z в масле',
    materialId: 'material-z',
    material: 'Сплав Z',
    materialDetails: 'Fe 66,2% · Ni 17,4% · Cr 11,8%',
    temperature: 900,
    duration: '40 минут',
    coolingMethod: 'В масле',
    property: 'Твёрдость',
    valueBefore: '25 HRC',
    valueAfter: '41 HRC',
    effect: '+16 HRC',
    equipmentId: 'equipment-vn12',
    equipment: 'Печь ВН-12',
    teamId: 'team-lab-3',
    team: 'Лаборатория №3',
    date: '2026-01-20',
    sourceDocumentId: 'doc-z20',
    sourceName: 'Протокол Z-20',
    sourcePage: 11,
    confidence: 0.93,
    notes: 'Серия проведена для сравнения способов охлаждения.',
  },
  {
    id: 'EXP-0176',
    title: 'Отжиг порошкового образца P-12',
    materialId: 'sample-p12',
    material: 'Образец P-12',
    materialDetails: 'Порошковый никелевый композит',
    temperature: 680,
    duration: '3 часа',
    coolingMethod: 'Не указан',
    property: 'Пористость',
    valueBefore: '14,2%',
    valueAfter: '9,8%',
    effect: '−4,4 п.п.',
    equipmentId: null,
    equipment: 'Не указано',
    teamId: 'team-powder-lab',
    team: 'Лаборатория порошковой металлургии',
    date: '2025-06-08',
    sourceDocumentId: 'doc-p12-journal',
    sourceName: 'Рабочий журнал P-12',
    sourcePage: 43,
    confidence: 0.64,
    notes:
      'Название установки и способ охлаждения не найдены в исходном документе.',
  },
];

const materials: MaterialRecord[] = [
  {
    id: 'material-x',
    name: 'Сплав X',
    category: 'Никелевый жаропрочный сплав',
    description:
      'Экспериментальный никелевый сплав для работы при повышенных температурах.',
    aliases: ['Alloy X', 'Сплав Х', 'X-61'],
    composition: [
      { element: 'Ni', percentage: '61,4%' },
      { element: 'Cr', percentage: '18,2%' },
      { element: 'Fe', percentage: '12,1%' },
    ],
    keyProperties: [
      { label: 'Предел прочности', value: '408–485 МПа' },
      { label: 'Исследованный диапазон', value: '850–950 °C' },
    ],
    experimentIds: ['EXP-0142', 'EXP-0208', 'EXP-0217'],
    documentIds: [
      'doc-t-2025-17',
      'doc-thermal-article',
      'doc-protocol-21v',
    ],
    issueIds: ['issue-temperature-gap', 'issue-strength-conflict'],
  },
  {
    id: 'material-y',
    name: 'Сплав Y',
    category: 'Никель-кобальтовый сплав',
    description:
      'Сплав для длительной эксплуатации под нагрузкой и при высокой температуре.',
    aliases: ['Alloy Y', 'Y-58'],
    composition: [
      { element: 'Ni', percentage: '58,7%' },
      { element: 'Cr', percentage: '20,3%' },
      { element: 'Co', percentage: '9,6%' },
    ],
    keyProperties: [
      { label: 'Твёрдость после старения', value: '38 HRC' },
      { label: 'Ползучесть', value: '0,18%' },
    ],
    experimentIds: ['EXP-0094', 'EXP-0113'],
    documentIds: ['doc-experiment-catalog-2024', 'doc-p44-2024'],
    issueIds: ['issue-missing-cooling'],
  },
  {
    id: 'material-z',
    name: 'Сплав Z',
    category: 'Железоникелевый сплав',
    description:
      'Сплав, исследуемый для сравнения способов охлаждения после закалки.',
    aliases: ['Alloy Z', 'Z-66'],
    composition: [
      { element: 'Fe', percentage: '66,2%' },
      { element: 'Ni', percentage: '17,4%' },
      { element: 'Cr', percentage: '11,8%' },
    ],
    keyProperties: [
      { label: 'Твёрдость после закалки', value: '41–46 HRC' },
      { label: 'Температура закалки', value: '900 °C' },
    ],
    experimentIds: ['EXP-0241', 'EXP-0246'],
    documentIds: ['doc-z19', 'doc-z20'],
    issueIds: [],
  },
  {
    id: 'sample-p12',
    name: 'Образец P-12',
    category: 'Порошковый никелевый композит',
    description:
      'Порошковый образец, для которого исследуется снижение пористости после отжига.',
    aliases: ['P-12'],
    composition: [{ element: 'Ni', percentage: 'основа' }],
    keyProperties: [{ label: 'Пористость после отжига', value: '9,8%' }],
    experimentIds: ['EXP-0176'],
    documentIds: ['doc-p12-journal'],
    issueIds: ['issue-missing-equipment'],
  },
];

const documents: DocumentRecord[] = [
  {
    id: 'doc-t-2025-17',
    title: 'Отчёт Т-2025-17',
    type: 'pdf',
    year: 2025,
    author: 'Лаборатория №3',
    description: 'Отчёт о термической обработке и испытаниях сплава X.',
    pages: 34,
    status: 'ready',
    indexedAt: '2026-06-30T10:12:00Z',
    extractedEntities: 38,
    experimentIds: ['EXP-0142'],
    materialIds: ['material-x'],
    issueIds: ['issue-temperature-gap'],
  },
  {
    id: 'doc-thermal-article',
    title: 'Термические режимы никелевых сплавов',
    type: 'pdf',
    year: 2025,
    author: 'Исследовательская группа №3',
    description: 'Научная статья с результатами повторной серии испытаний.',
    pages: 12,
    status: 'ready',
    indexedAt: '2026-06-30T10:18:00Z',
    extractedEntities: 24,
    experimentIds: ['EXP-0208'],
    materialIds: ['material-x'],
    issueIds: [],
  },
  {
    id: 'doc-protocol-21v',
    title: 'Протокол испытаний 21-В',
    type: 'docx',
    year: 2025,
    author: 'Лаборатория №5',
    description: 'Высокотемпературная выдержка образца сплава X.',
    pages: 8,
    status: 'ready',
    indexedAt: '2026-06-30T10:25:00Z',
    extractedEntities: 14,
    experimentIds: ['EXP-0217'],
    materialIds: ['material-x'],
    issueIds: ['issue-strength-conflict'],
  },
  {
    id: 'doc-experiment-catalog-2024',
    title: 'Каталог экспериментов 2024',
    type: 'xlsx',
    year: 2024,
    author: 'Центр материаловедения',
    description: 'Структурированный каталог экспериментальных серий.',
    pages: null,
    status: 'ready',
    indexedAt: '2026-06-30T11:02:00Z',
    extractedEntities: 126,
    experimentIds: ['EXP-0094'],
    materialIds: ['material-y'],
    issueIds: [],
  },
  {
    id: 'doc-p44-2024',
    title: 'Отчёт П-44/2024',
    type: 'pdf',
    year: 2024,
    author: 'Центр материаловедения',
    description: 'Результаты длительных испытаний на ползучесть.',
    pages: 41,
    status: 'ready',
    indexedAt: '2026-06-30T11:14:00Z',
    extractedEntities: 29,
    experimentIds: ['EXP-0113'],
    materialIds: ['material-y'],
    issueIds: ['issue-missing-cooling'],
  },
  {
    id: 'doc-z19',
    title: 'Протокол Z-19',
    type: 'docx',
    year: 2026,
    author: 'Лаборатория №3',
    description: 'Закалка сплава Z с охлаждением в воде.',
    pages: 14,
    status: 'ready',
    indexedAt: '2026-06-30T11:31:00Z',
    extractedEntities: 19,
    experimentIds: ['EXP-0241'],
    materialIds: ['material-z'],
    issueIds: [],
  },
  {
    id: 'doc-z20',
    title: 'Протокол Z-20',
    type: 'docx',
    year: 2026,
    author: 'Лаборатория №3',
    description: 'Закалка сплава Z с охлаждением в масле.',
    pages: 15,
    status: 'ready',
    indexedAt: '2026-06-30T11:35:00Z',
    extractedEntities: 21,
    experimentIds: ['EXP-0246'],
    materialIds: ['material-z'],
    issueIds: [],
  },
  {
    id: 'doc-p12-journal',
    title: 'Рабочий журнал P-12',
    type: 'pdf',
    year: 2025,
    author: 'Лаборатория порошковой металлургии',
    description: 'Журнал подготовки и отжига порошкового образца P-12.',
    pages: 58,
    status: 'ready',
    indexedAt: '2026-06-30T12:08:00Z',
    extractedEntities: 17,
    experimentIds: ['EXP-0176'],
    materialIds: ['sample-p12'],
    issueIds: ['issue-missing-equipment'],
  },
];

const dataIssues: DataIssueRecord[] = [
  {
    id: 'issue-temperature-gap',
    type: 'unexplored_range',
    severity: 'high',
    title: 'Не исследован диапазон 860–940 °C',
    description:
      'Для сплава X отсутствуют эксперименты между основной серией при 850 °C и испытанием при 950 °C.',
    recommendation:
      'Провести промежуточную серию при 900 °C с совпадающей длительностью выдержки.',
    detectedAt: '2026-06-30T12:30:00Z',
    relatedEntities: [
      {
        id: 'material-x',
        label: 'Сплав X',
        entityType: 'material',
      },
      {
        id: 'EXP-0142',
        label: 'EXP-0142',
        entityType: 'experiment',
      },
    ],
  },
  {
    id: 'issue-strength-conflict',
    type: 'conflict',
    severity: 'high',
    title: 'Противоречивое изменение прочности',
    description:
      'При 850 °C прочность растёт, а при 950 °C снижается. Состав последнего образца указан не полностью.',
    recommendation:
      'Проверить состав образца и повторить измерение при одинаковом способе охлаждения.',
    detectedAt: '2026-06-30T12:34:00Z',
    relatedEntities: [
      {
        id: 'EXP-0208',
        label: 'EXP-0208',
        entityType: 'experiment',
      },
      {
        id: 'EXP-0217',
        label: 'EXP-0217',
        entityType: 'experiment',
      },
      {
        id: 'doc-protocol-21v',
        label: 'Протокол испытаний 21-В',
        entityType: 'document',
      },
    ],
  },
  {
    id: 'issue-missing-cooling',
    type: 'missing_data',
    severity: 'medium',
    title: 'Не указан способ охлаждения',
    description:
      'Для испытания ползучести сплава Y отсутствуют сведения об охлаждении.',
    recommendation: 'Проверить лабораторный журнал и дополнить запись.',
    detectedAt: '2026-06-30T12:38:00Z',
    relatedEntities: [
      {
        id: 'EXP-0113',
        label: 'EXP-0113',
        entityType: 'experiment',
      },
      {
        id: 'doc-p44-2024',
        label: 'Отчёт П-44/2024',
        entityType: 'document',
      },
    ],
  },
  {
    id: 'issue-missing-equipment',
    type: 'missing_data',
    severity: 'medium',
    title: 'Не указана установка',
    description:
      'В рабочем журнале P-12 не найдено название оборудования для отжига.',
    recommendation:
      'Связаться с лабораторией или проверить журнал эксплуатации оборудования.',
    detectedAt: '2026-06-30T12:41:00Z',
    relatedEntities: [
      {
        id: 'sample-p12',
        label: 'Образец P-12',
        entityType: 'material',
      },
      {
        id: 'doc-p12-journal',
        label: 'Рабочий журнал P-12',
        entityType: 'document',
      },
    ],
  },
  {
    id: 'issue-unit-mismatch',
    type: 'unit_mismatch',
    severity: 'low',
    title: 'Несопоставимые единицы твёрдости',
    description:
      'В части источников твёрдость указана по шкале HRC, в других — по Виккерсу.',
    recommendation:
      'Добавить явное преобразование единиц с указанием использованного стандарта.',
    detectedAt: '2026-06-30T12:45:00Z',
    relatedEntities: [
      {
        id: 'doc-experiment-catalog-2024',
        label: 'Каталог экспериментов 2024',
        entityType: 'document',
      },
    ],
  },
];

const mentionableEntities: MentionableEntity[] = [
  ...materials.map((material) => ({
    id: material.id,
    type: 'material' as const,
    label: material.name,
    subtitle: material.category,
  })),
  ...experiments.map((experiment) => ({
    id: experiment.id,
    type: 'experiment' as const,
    label: experiment.id,
    subtitle: `${experiment.material} · ${experiment.property}`,
  })),
  ...documents.map((document) => ({
    id: document.id,
    type: 'document' as const,
    label: document.title,
    subtitle: `${document.type.toUpperCase()} · ${document.year}`,
  })),
  ...dataIssues.map((issue) => ({
    id: issue.id,
    type: 'data_issue' as const,
    label: issue.title,
    subtitle: 'Проблема в данных',
  })),
  ...knowledgeGraphData.entities
    .filter(
      (entity) =>
        entity.type !== 'material' &&
        entity.type !== 'experiment' &&
        entity.type !== 'document',
    )
    .map((entity) => ({
      id: entity.id,
      type: entity.type,
      label: entity.title,
      subtitle: entity.subtitle,
    })),
];

const createMockExtraction = (
  documentId: string,
): DocumentExtractionResult => ({
  documentId,
  entities: [
    {
      id: `${documentId}-material-n47`,
      type: 'material',
      name: 'Сплав N-47',
      attributes: [
        { name: 'Ni', value: 54.2, unit: '%' },
        { name: 'Cr', value: 21.1, unit: '%' },
      ],
      source: { documentId, page: 3 },
    },
    {
      id: `${documentId}-experiment-1`,
      type: 'experiment',
      name: 'Термообработка сплава N-47',
      attributes: [
        { name: 'Температура', value: 780, unit: '°C' },
        { name: 'Длительность', value: 4, unit: 'ч' },
      ],
      source: { documentId, page: 8 },
    },
    {
      id: `${documentId}-property-hardness`,
      type: 'property',
      name: 'Твёрдость',
      attributes: [
        { name: 'До обработки', value: 29, unit: 'HRC' },
        { name: 'После обработки', value: 36, unit: 'HRC' },
      ],
      source: { documentId, page: 11 },
    },
    {
      id: `${documentId}-unclassified-method`,
      type: 'unclassified',
      name: 'Метод микродюрометрии М-7',
      attributes: [
        {
          name: 'Контекст',
          value: 'Использован для контрольного измерения твёрдости',
        },
      ],
      source: { documentId, page: 10 },
    },
  ],
  relations: [
    {
      id: `${documentId}-relation-1`,
      sourceId: `${documentId}-experiment-1`,
      type: 'USES_MATERIAL',
      targetId: `${documentId}-material-n47`,
      source: { documentId, page: 8 },
    },
    {
      id: `${documentId}-relation-2`,
      sourceId: `${documentId}-experiment-1`,
      type: 'MEASURES',
      targetId: `${documentId}-property-hardness`,
      source: { documentId, page: 11 },
    },
    {
      id: `${documentId}-relation-3`,
      sourceId: `${documentId}-experiment-1`,
      type: 'USES',
      targetId: `${documentId}-unclassified-method`,
      source: { documentId, page: 10 },
    },
  ],
  warnings: [
    'Тип сущности «Метод микродюрометрии М-7» определить не удалось.',
  ],
});

const api = {
  async getHomePageData(): Promise<HomePageData> {
    return Promise.resolve(homePageData);
  },

  async searchKnowledge(query: string): Promise<SearchKnowledgeResponse> {
    return Promise.resolve({
      query,
      experimentsFound: 7,
      documentsFound: 12,
    });
  },

  async askResearchAssistant(
    request: AskAssistantRequest,
  ): Promise<AskAssistantResponse> {
    const mentionedEntityCitations = request.mentions.map((mention) => ({
      id: `citation-mentioned-${mention.type}-${mention.id}`,
      entityId: mention.id,
      entityType: mention.type,
      label: mention.label,
      description: 'Сущность добавлена пользователем в контекст запроса',
    }));

    return Promise.resolve({
      message: {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text:
          `По запросу «${request.text}» найдено несколько связанных исследований. ` +
          'Наиболее часто встречается режим термообработки 850 °C в течение двух часов. ' +
          'В большинстве описанных экспериментов после него наблюдалось увеличение прочности. ' +
          'Для окончательного вывода нужно сравнить составы образцов и методики измерения.',
        citations: [
          ...mentionedEntityCitations,
          {
            id: 'citation-experiment-142',
            entityId: 'EXP-0142',
            entityType: 'experiment',
            label: 'EXP-0142',
            description: 'Термообработка сплава X при 850 °C',
          },
          {
            id: 'citation-document-t17',
            entityId: 'doc-t-2025-17',
            entityType: 'document',
            label: 'Отчёт Т-2025-17',
            description: 'Исходный технический отчёт',
            page: 18,
          },
          {
            id: 'citation-material-x',
            entityId: 'material-x',
            entityType: 'material',
            label: 'Сплав X',
            description: 'Карточка материала и связанная история',
          },
        ],
      },
      sourcesFound: 12,
      experimentsFound: 7,
    });
  },

  async getChats(): Promise<ChatSummary[]> {
    return Promise.resolve(
      chats.map(({ id, title, group }) => ({ id, title, group })),
    );
  },

  async getChat(chatId: string): Promise<ResearchChat | null> {
    return Promise.resolve(chats.find((chat) => chat.id === chatId) ?? null);
  },

  async getKnowledgeGraph(): Promise<KnowledgeGraphData> {
    return Promise.resolve(knowledgeGraphData);
  },

  async getKnowledgeGraphPreview(): Promise<KnowledgeGraphData> {
    return Promise.resolve({
      entities: knowledgeGraphData.entities.filter((entity) =>
        knowledgeGraphPreviewEntityIds.has(entity.id),
      ),
      connections: knowledgeGraphData.connections.filter(
        (connection) =>
          knowledgeGraphPreviewEntityIds.has(connection.source) &&
          knowledgeGraphPreviewEntityIds.has(connection.target),
      ),
    });
  },

  async getExperiments(): Promise<ExperimentRecord[]> {
    return Promise.resolve(experiments);
  },

  async getExperiment(experimentId: string): Promise<ExperimentRecord | null> {
    return Promise.resolve(
      experiments.find((experiment) => experiment.id === experimentId) ?? null,
    );
  },

  async getMaterials(): Promise<MaterialRecord[]> {
    return Promise.resolve(materials);
  },

  async getMaterial(materialId: string): Promise<MaterialRecord | null> {
    return Promise.resolve(
      materials.find((material) => material.id === materialId) ?? null,
    );
  },

  async getDocuments(): Promise<DocumentRecord[]> {
    return Promise.resolve(documents);
  },

  async getDocument(documentId: string): Promise<DocumentRecord | null> {
    return Promise.resolve(
      documents.find((document) => document.id === documentId) ?? null,
    );
  },

  async getDataIssues(): Promise<DataIssueRecord[]> {
    return Promise.resolve(dataIssues);
  },

  async searchMentionableEntities(
    query: string,
  ): Promise<MentionableEntity[]> {
    const normalizedQuery = query.trim().toLocaleLowerCase('ru-RU');

    return Promise.resolve(
      mentionableEntities
        .filter((entity) =>
          `${entity.label} ${entity.subtitle}`
            .toLocaleLowerCase('ru-RU')
            .includes(normalizedQuery),
        )
        .slice(0, 10),
    );
  },

  async uploadDocument(file: File): Promise<UploadDocumentResponse> {
    const extension = file.name.split('.').pop()?.toLowerCase();
    const supportedTypes: DocumentRecord['type'][] = [
      'pdf',
      'docx',
      'xlsx',
      'csv',
    ];
    const type = supportedTypes.includes(
      extension as DocumentRecord['type'],
    )
      ? (extension as DocumentRecord['type'])
      : 'pdf';
    const documentId = `uploaded-${Date.now()}`;
    const document: DocumentRecord = {
      id: documentId,
      title: file.name.replace(/\.[^.]+$/, ''),
      type,
      year: new Date().getFullYear(),
      author: 'Загружено пользователем',
      description: 'Новый документ, обработанный системой извлечения знаний.',
      pages: type === 'xlsx' || type === 'csv' ? null : 18,
      status: 'ready',
      indexedAt: new Date().toISOString(),
      extractedEntities: 4,
      experimentIds: [],
      materialIds: [],
      issueIds: [],
    };
    const extraction = createMockExtraction(documentId);

    documents.push(document);

    return Promise.resolve({ document, extraction });
  },

  async publishDocumentExtraction(
    request: PublishExtractionRequest,
  ): Promise<PublishExtractionResponse> {
    const sourceDocument = documents.find(
      (document) => document.id === request.documentId,
    );

    if (sourceDocument) {
      sourceDocument.materialIds = request.entities
        .filter((entity) => entity.type === 'material')
        .map((entity) => entity.id);
      sourceDocument.experimentIds = request.entities
        .filter((entity) => entity.type === 'experiment')
        .map((entity) => entity.id);
    }

    request.entities.forEach((entity, index) => {
      if (
        !knowledgeGraphData.entities.some(
          (existingEntity) => existingEntity.id === entity.id,
        )
      ) {
        knowledgeGraphData.entities.push({
          id: entity.id,
          type: entity.type,
          title: entity.name,
          subtitle:
            entity.type === 'unclassified'
              ? 'Тип сущности не определён'
              : 'Извлечено из загруженного документа',
          description: `Сущность извлечена из документа ${request.documentId}.`,
          position: {
            x: 180 + (index % 2) * 330,
            y: 930 + Math.floor(index / 2) * 170,
          },
          attributes: entity.attributes,
          sources: [entity.source],
        });
        mentionableEntities.push({
          id: entity.id,
          type: entity.type,
          label: entity.name,
          subtitle: 'Извлечено из загруженного документа',
        });
      }

      if (
        entity.type === 'material' &&
        !materials.some((material) => material.id === entity.id)
      ) {
        const relatedExperimentIds = request.relations
          .filter(
            (relation) =>
              relation.type === 'USES_MATERIAL' &&
              relation.targetId === entity.id,
          )
          .map((relation) => relation.sourceId);

        materials.push({
          id: entity.id,
          name: entity.name,
          category: 'Материал из загруженного документа',
          description: `Материал извлечён из документа ${request.documentId}.`,
          aliases: [],
          composition: entity.attributes.map((attribute) => ({
            element: attribute.name,
            percentage: `${String(attribute.value)}${
              attribute.unit ? ` ${attribute.unit}` : ''
            }`,
          })),
          keyProperties: [],
          experimentIds: relatedExperimentIds,
          documentIds: [request.documentId],
          issueIds: [],
        });
      }

      if (
        entity.type === 'experiment' &&
        !experiments.some((experiment) => experiment.id === entity.id)
      ) {
        const materialRelation = request.relations.find(
          (relation) =>
            relation.type === 'USES_MATERIAL' &&
            relation.sourceId === entity.id,
        );
        const materialEntity = request.entities.find(
          (item) => item.id === materialRelation?.targetId,
        );
        const propertyRelation = request.relations.find(
          (relation) =>
            relation.type === 'MEASURES' && relation.sourceId === entity.id,
        );
        const propertyEntity = request.entities.find(
          (item) => item.id === propertyRelation?.targetId,
        );
        const temperature = entity.attributes.find(
          (attribute) => attribute.name === 'Температура',
        );
        const duration = entity.attributes.find(
          (attribute) => attribute.name === 'Длительность',
        );

        experiments.push({
          id: entity.id,
          title: entity.name,
          materialId: materialEntity?.id ?? 'unknown-material',
          material: materialEntity?.name ?? 'Материал не указан',
          materialDetails: 'Извлечено из загруженного документа',
          temperature:
            typeof temperature?.value === 'number' ? temperature.value : 0,
          duration: duration
            ? `${String(duration.value)}${
                duration.unit ? ` ${duration.unit}` : ''
              }`
            : 'Не указано',
          coolingMethod: 'Не указано',
          property: propertyEntity?.name ?? 'Свойство не указано',
          valueBefore: '—',
          valueAfter: '—',
          effect: '—',
          equipmentId: null,
          equipment: 'Не указано',
          teamId: 'unknown-team',
          team: 'Не указано',
          date: new Date().toISOString().slice(0, 10),
          sourceDocumentId: request.documentId,
          sourceName: sourceDocument?.title ?? request.documentId,
          sourcePage: entity.source.page ?? 1,
          confidence: 1,
          notes: 'Добавлено пользователем после просмотра результата извлечения.',
        });
      }
    });

    request.relations.forEach((relation) => {
      if (
        !knowledgeGraphData.connections.some(
          (connection) => connection.id === relation.id,
        )
      ) {
        knowledgeGraphData.connections.push({
          id: relation.id,
          source: relation.sourceId,
          target: relation.targetId,
          label: relation.type,
        });
      }
    });

    return Promise.resolve({
      documentId: request.documentId,
      publishedEntityIds: request.entities.map((entity) => entity.id),
      publishedRelationIds: request.relations.map((relation) => relation.id),
    });
  },
};

export default api;
