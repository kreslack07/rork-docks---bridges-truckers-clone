import React, { ReactNode, FunctionComponent } from 'react';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';
import { OnboardingProvider } from '@/context/OnboardingContext';
import { TruckSettingsProvider } from '@/context/TruckSettingsContext';
import { FavouritesProvider } from '@/context/FavouritesContext';
import { NotificationsProvider } from '@/context/NotificationsContext';
import { CommunityProvider } from '@/context/CommunityContext';
import { LiveDataProvider } from '@/context/LiveDataContext';
import { NavigationProvider } from '@/context/NavigationContext';
import { ToastProvider } from '@/context/ToastContext';

type ProviderComponent = FunctionComponent<{ children: ReactNode }>;

function composeProviders(providers: ProviderComponent[]) {
  return ({ children }: { children: ReactNode }) =>
    providers.reduceRight<ReactNode>(
      (acc, Provider) => <Provider>{acc}</Provider>,
      children,
    );
}

const ComposedProviders = composeProviders([
  ThemeProvider,
  ToastProvider,
  AuthProvider,
  OnboardingProvider,
  NotificationsProvider,
  TruckSettingsProvider,
  FavouritesProvider,
  CommunityProvider,
  LiveDataProvider,
  NavigationProvider,
]);

export function AppProviders({ children }: { children: ReactNode }) {
  return <ComposedProviders>{children}</ComposedProviders>;
}
