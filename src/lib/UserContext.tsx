'use client';

import { createContext, useContext } from 'react';

const UserContext = createContext<string>('Paola');

export function UserProvider({ username, children }: { username: string; children: React.ReactNode }) {
  return <UserContext.Provider value={username}>{children}</UserContext.Provider>;
}

export function useUser(): string {
  return useContext(UserContext);
}
