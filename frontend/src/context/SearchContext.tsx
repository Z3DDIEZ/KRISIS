import { createContext, useContext } from 'react'

interface SearchContextType {
    searchQuery: string
    setSearchQuery: (query: string) => void
}

export const SearchContext = createContext<SearchContextType>({
    searchQuery: '',
    setSearchQuery: () => { }
})

export const useSearch = () => useContext(SearchContext)
