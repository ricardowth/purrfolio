import { Route, Routes } from 'react-router-dom';
import { useI18n } from '@/lib/i18n';
import { useData } from '@/store/DataContext';
import { Layout, RequirePet } from '@/components/Layout';
import { ErrorNote, Spinner } from '@/components/ui';
import DashboardPage from '@/pages/DashboardPage';
import HealthPage from '@/pages/HealthPage';
import IssueDetailPage from '@/pages/IssueDetailPage';
import AppointmentsPage from '@/pages/AppointmentsPage';
import VaccinationsPage from '@/pages/VaccinationsPage';
import MedicationsPage from '@/pages/MedicationsPage';
import FoodPage from '@/pages/FoodPage';
import WeightPage from '@/pages/WeightPage';
import JournalPage from '@/pages/JournalPage';
import DocumentsPage from '@/pages/DocumentsPage';
import CarePage from '@/pages/CarePage';
import CareSheetPage from '@/pages/CareSheetPage';
import ContactsPage from '@/pages/ContactsPage';
import PetsPage from '@/pages/PetsPage';
import SettingsPage from '@/pages/SettingsPage';

/** Pages that only make sense once a pet exists. */
const petPages: [string, React.ComponentType][] = [
  ['/', DashboardPage],
  ['/health', HealthPage],
  ['/issues/:issueId', IssueDetailPage],
  ['/appointments', AppointmentsPage],
  ['/vaccinations', VaccinationsPage],
  ['/medications', MedicationsPage],
  ['/food', FoodPage],
  ['/weight', WeightPage],
  ['/journal', JournalPage],
  ['/documents', DocumentsPage],
  ['/care', CarePage],
  ['/care/sheet', CareSheetPage],
];

export default function App() {
  const { loading, error } = useData();
  const { t } = useI18n();

  return (
    <Layout>
      {error && <ErrorNote>{error}</ErrorNote>}
      {loading ? (
        <Spinner label={t('common.loadingRecords')} />
      ) : (
        <Routes>
          {petPages.map(([path, Page]) => (
            <Route
              key={path}
              path={path}
              element={
                <RequirePet>
                  <Page />
                </RequirePet>
              }
            />
          ))}
          <Route path="/contacts" element={<ContactsPage />} />
          <Route path="/pets" element={<PetsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<DashboardPage />} />
        </Routes>
      )}
    </Layout>
  );
}
