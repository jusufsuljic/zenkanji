import React from 'react';
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from 'next-themes';

type AppThemeProviderProps = React.PropsWithChildren<Omit<ThemeProviderProps, 'children'>>;

const StableNextThemesProvider =
  NextThemesProvider as unknown as React.ComponentType<
    React.PropsWithChildren<ThemeProviderProps>
  >;

export const AppThemeProvider: React.FC<AppThemeProviderProps> = ({
  children,
  ...props
}) => {
  return <StableNextThemesProvider {...props}>{children}</StableNextThemesProvider>;
};
