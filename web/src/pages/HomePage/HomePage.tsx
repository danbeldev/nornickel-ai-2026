import {
  Box,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardStats } from '../../components/home/DashboardStats';
import { DataIssuesPanel } from '../../components/home/DataIssuesPanel';
import { DataSourcesPanel } from '../../components/home/DataSourcesPanel';
import { KnowledgeGraphPreview } from '../../components/home/KnowledgeGraphPreview';
import { RecentChatsList } from '../../components/home/RecentChatsList';
import { ResearchSearchPanel } from '../../components/home/ResearchSearchPanel';
import { WorkspaceLayout } from '../../components/layout/WorkspaceLayout';
import api from '../../data/api';
import {
  ChatSummary,
  DataIssueRecord,
  DocumentRecord,
  HomePageData,
  KnowledgeGraphData,
} from '../../data/types';

export const HomePage = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<HomePageData | null>(null);
  const [graphPreview, setGraphPreview] =
    useState<KnowledgeGraphData | null>(null);
  const [dataIssues, setDataIssues] = useState<DataIssueRecord[] | null>(null);
  const [recentChats, setRecentChats] = useState<ChatSummary[] | null>(null);
  const [recentDocuments, setRecentDocuments] =
    useState<DocumentRecord[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      api.getHomePageData(),
      api.getKnowledgeGraphPreview(),
      api.getRecentDataIssues(5),
      api.getRecentChats(5),
      api.getRecentDocuments(5),
    ]).then(
      ([
        homePageData,
        knowledgeGraphPreview,
        issues,
        chatItems,
        documentItems,
      ]) => {
        setData(homePageData);
        setGraphPreview(knowledgeGraphPreview);
        setDataIssues(issues);
        setRecentChats(chatItems);
        setRecentDocuments(documentItems);
      },
    );
  }, []);

  const handleSearch = async (query: string) => {
    setSearchLoading(true);

    try {
      const chat = await api.createChat({
        text: query,
        mentions: [],
      });
      navigate(`/chat/${chat.id}`);
    } finally {
      setSearchLoading(false);
    }
  };

  return (
    <WorkspaceLayout>
      <Box>
        <Box sx={{ px: { xs: 2, sm: 3, xl: 4 }, py: { xs: 3, md: 4 } }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            alignItems={{ xs: 'flex-start', sm: 'flex-end' }}
            justifyContent="space-between"
            spacing={1}
            sx={{ mb: 3 }}
          >
            <Box>
              <Typography variant="caption" color="text.secondary">
                Рабочее пространство / Обзор
              </Typography>
              <Typography component="h1" variant="h4" fontWeight={800} sx={{ mt: 0.5 }}>
                Исследование знаний
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Последнее обновление базы: сегодня, 14:32
            </Typography>
          </Stack>

          {data &&
          graphPreview &&
          dataIssues &&
          recentChats &&
          recentDocuments ? (
            <Stack spacing={2}>
              <ResearchSearchPanel
                examples={data.exampleQueries}
                loading={searchLoading}
                onSearch={handleSearch}
              />
              <DashboardStats stats={data.stats} />

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', xl: 'minmax(0, 2fr) minmax(320px, 1fr)' },
                  gap: 2,
                }}
              >
                <KnowledgeGraphPreview data={graphPreview} />
                <DataIssuesPanel issues={dataIssues} />
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', xl: 'minmax(0, 2fr) minmax(320px, 1fr)' },
                  gap: 2,
                }}
              >
                <RecentChatsList items={recentChats} />
                <DataSourcesPanel documents={recentDocuments} />
              </Box>
            </Stack>
          ) : (
            <Stack spacing={2}>
              <Skeleton variant="rounded" height={210} sx={{ borderRadius: 1.5 }} />
              <Skeleton variant="rounded" height={480} sx={{ borderRadius: 1.5 }} />
            </Stack>
          )}
        </Box>
      </Box>
    </WorkspaceLayout>
  );
};
