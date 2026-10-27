import React, { useState, useEffect } from 'react';
import { Sidebar, PageId } from './components/Sidebar';
import { TopNavbar } from './components/TopNavbar';
import { Dashboard } from './pages/Dashboard';
import { EmailScanner } from './pages/EmailScanner';
import { ScanHistory } from './pages/ScanHistory';
import { Reports } from './pages/Reports';
import { Charts } from './pages/Charts';
import { ModelInsights } from './pages/ModelInsights';
import { checkBackendHealth, fetchDashboardData } from './services/api';
import { DashboardData } from './types';

export function App() {
  const [activePage, setActivePage] = useState<PageId>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isBackendOnline, setIsBackendOnline] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      const online = await checkBackendHealth();
      setIsBackendOnline(online);
      const data = await fetchDashboardData();
      setDashboardData(data);
    };

    checkStatus();
    const interval = setInterval(checkStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="app-container">
      {/* Subtle background ambient orbs */}
      <div className="bg-decor-orb orb-purple" />
      <div className="bg-decor-orb orb-peach" />

      {/* Clean Glass Sidebar */}
      <Sidebar
        activePage={activePage}
        onSelectPage={setActivePage}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <main className="main-content">
        <TopNavbar
          activePage={activePage}
          onOpenMobile={() => setIsMobileMenuOpen(true)}
          isBackendOnline={isBackendOnline}
        />

        <div className="content-body">
          {activePage === 'dashboard' && dashboardData && (
            <Dashboard
              data={dashboardData}
              onNavigate={setActivePage}
            />
          )}

          {activePage === 'scanner' && (
            <EmailScanner />
          )}

          {activePage === 'history' && (
            <ScanHistory onNavigate={setActivePage} />
          )}

          {activePage === 'reports' && (
            <Reports onNavigate={setActivePage} />
          )}

          {activePage === 'charts' && (
            <Charts onNavigate={setActivePage} />
          )}

          {activePage === 'insights' && (
            <ModelInsights />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
