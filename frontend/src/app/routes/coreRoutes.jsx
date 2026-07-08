/* eslint-disable react-refresh/only-export-components */
import { lazy } from 'react';
import { Navigate } from 'react-router-dom';

const DashboardPage = lazy(() => import('../pages/dashboard/DashboardPage'));
const SettingsPage = lazy(() => import('../pages/settings/SettingsPage'));
const SearchPage = lazy(() => import('../pages/search/SearchPage'));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'));
const ListsPage = lazy(() => import('../pages/lists/ListsPage'));
const AboutPage = lazy(() => import('../pages/about/AboutPage'));
const StatisticsPage = lazy(() => import('../pages/statistics/StatisticsPage'));

export const coreRoutes = [
  { index: true, element: <Navigate to="/dashboard" replace /> },
  { path: 'dashboard', element: <DashboardPage /> },
  { path: 'search', element: <SearchPage /> },
  { path: 'lists', element: <ListsPage /> },
  { path: 'statistics', element: <StatisticsPage /> },
  { path: 'settings', element: <SettingsPage /> },
  { path: 'about', element: <AboutPage /> },
  { path: '*', element: <NotFoundPage /> },
];
