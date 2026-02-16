import React, { createContext, useState, useMemo } from 'react'

export interface SearchContextType {
  searchQuery: string
  setSearchQuery: (query: string) => void
}

// Internal context for hook use
const SearchContext = createContext<SearchContextType | undefined>(undefined)

export const SearchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [searchQuery, setSearchQuery] = useState('')

  const value = useMemo(
    () => ({
      searchQuery,
      setSearchQuery,
    }),
    [searchQuery]
  )

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>
}

export { SearchContext }
