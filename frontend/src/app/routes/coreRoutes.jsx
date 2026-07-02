/* eslint-disable react-refresh/only-export-components */
import { lazy } from 'react';
import { Navigate } from 'react-router-dom';

const DashboardPage = lazy(() => import('../pages/dashboard/DashboardPage'));
const SettingsPage = lazy(() => import('../pages/settings/SettingsPage'));
const SearchPage = lazy(() => import('../pages/search/SearchPage'));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'));
const PlaceholderPage = lazy(() => import('../pages/PlaceholderPage'));
const ListsPage = lazy(() => import('../pages/lists/ListsPage'));

export const coreRoutes = [
  { index: true, element: <Navigate to="/dashboard" replace /> },
  { path: 'dashboard', element: <DashboardPage /> },
  { path: 'search', element: <SearchPage /> },
  { path: 'lists', element: <ListsPage /> },
  { path: 'settings', element: <SettingsPage /> },
  { path: '*', element: <NotFoundPage /> },
];
