import { Navigate, Route, Routes } from 'react-router-dom';
import { ChatPage } from '../pages/ChatPage/ChatPage';
import { ExperimentsPage } from '../pages/ExperimentsPage/ExperimentsPage';
import { HomePage } from '../pages/HomePage/HomePage';
import { KnowledgeGraphPage } from '../pages/KnowledgeGraphPage/KnowledgeGraphPage';
import { MaterialsPage } from '../pages/MaterialsPage/MaterialsPage';
import { DocumentsPage } from '../pages/DocumentsPage/DocumentsPage';
import { DataIssuesPage } from '../pages/DataIssuesPage/DataIssuesPage';

export const AppRouter = () => (
  <Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/chat" element={<Navigate to="/chat/new" replace />} />
    <Route path="/chat/new" element={<ChatPage />} />
    <Route path="/chat/:chatId" element={<ChatPage />} />
    <Route path="/knowledge-graph" element={<KnowledgeGraphPage />} />
    <Route path="/experiments" element={<ExperimentsPage />} />
    <Route path="/experiments/:experimentId" element={<ExperimentsPage />} />
    <Route path="/materials" element={<MaterialsPage />} />
    <Route path="/materials/:materialId" element={<MaterialsPage />} />
    <Route path="/documents" element={<DocumentsPage />} />
    <Route path="/documents/:documentId" element={<DocumentsPage />} />
    <Route path="/data-issues" element={<DataIssuesPage />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);
