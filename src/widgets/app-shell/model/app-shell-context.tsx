import { createContext, createElement, useContext, type ReactNode } from 'react';

export type AppShellContextValue = ReturnType<typeof import('./use-app-shell').useAppShell>;

const AppShellContext = createContext<AppShellContextValue | null>(null);

export function AppShellContextProvider({
  value,
  children,
}: {
  value: AppShellContextValue;
  children: ReactNode;
}) {
  return createElement(AppShellContext.Provider, { value }, children);
}

export function useAppShellContext() {
  const context = useContext(AppShellContext);

  if (!context) {
    throw new Error('AppShellContextProvider is missing.');
  }

  return context;
}
