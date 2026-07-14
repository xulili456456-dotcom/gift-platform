import { Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import TopBar from './TopBar';
import BottomTabBar from './BottomTabBar';
import useAuthStore from '../../store/authStore';

const pageKeyMap = {
  '/home': 'nav.home',
  '/tasks': 'nav.tasks',
  '/mine': 'nav.mine',
  '/admin': 'admin.title',
};

export default function AppLayout() {
  const { t } = useTranslation();
  const location = useLocation();
  const { user } = useAuthStore();

  const key = pageKeyMap[location.pathname] || Object.entries(pageKeyMap).find(([k]) => location.pathname.startsWith(k))?.[1];
  const title = key ? t(key) : t('app.name');
  const isAdminPage = location.pathname.startsWith('/admin');
  const isHomePage = location.pathname === '/home' || location.pathname === '/';
  const isMineRoot = location.pathname === '/mine';
  const isMineSubPage = location.pathname.startsWith('/mine/');

  const showTopBar = !isAdminPage && !isHomePage && !isMineRoot && !isMineSubPage;

  return (
    <div className="page-container flex flex-col min-h-dvh bg-bg">
      {/* TopBar - Tasks page (in-flow, not fixed) */}
      {showTopBar && <TopBar title={title} fixed={false} />}

      {/* Transparent TopBar for hero pages (fixed, overlays hero) */}
      {(isHomePage || isMineRoot) && <TopBar title="" transparent />}

      {/* Mine sub-pages: no TopBar, own header */}

      <main className={`flex-1 ${isAdminPage ? 'pb-4' : 'pb-24'}`}>
        <Outlet />
      </main>

      {!isAdminPage && <BottomTabBar />}
    </div>
  );
}
