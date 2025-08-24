import { useCallback, useEffect, useMemo, useState } from "react";

export function useDebouncedSearch<T>(
  searchFunction: (query: string) => Promise<T[]>,
  delay: number = 300
) {
  // Memoize the search function to prevent infinite re-renders
  const memoizedSearchFunction = useCallback(searchFunction, []);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce the search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, delay);

    return () => clearTimeout(timer);
  }, [query, delay]);

  // Perform search when debounced query changes
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const performSearch = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const searchResults = await memoizedSearchFunction(debouncedQuery);
        setResults(searchResults);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Search failed");
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    performSearch();
  }, [debouncedQuery, memoizedSearchFunction]);

  const clearSearch = useCallback(() => {
    setQuery("");
    setResults([]);
    setError(null);
  }, []);

  return {
    query,
    setQuery,
    results,
    isLoading,
    error,
    clearSearch,
    hasResults: results.length > 0,
  };
}

// Hook for local search with debouncing
export function useDebouncedLocalSearch<T>(
  data: T[],
  searchFields: (keyof T)[],
  delay: number = 300
) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filteredData, setFilteredData] = useState<T[]>(data);

  // Memoize the data to prevent unnecessary re-renders
  const memoizedData = useMemo(() => data, [JSON.stringify(data)]);

  // Debounce the search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, delay);

    return () => clearTimeout(timer);
  }, [query, delay]);

  // Filter data when debounced query changes
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setFilteredData(memoizedData);
      return;
    }

    const searchTerm = debouncedQuery.toLowerCase();
    const filtered = memoizedData.filter(item => {
      return searchFields.some(field => {
        const value = item[field];
        if (typeof value === "string") {
          return value.toLowerCase().includes(searchTerm);
        }
        if (typeof value === "number") {
          return value.toString().includes(searchTerm);
        }
        return false;
      });
    });

    setFilteredData(filtered);
  }, [debouncedQuery, memoizedData, searchFields]);

  const clearSearch = useCallback(() => {
    setQuery("");
    setFilteredData(memoizedData);
  }, [memoizedData]);

  return {
    query,
    setQuery,
    filteredData,
    clearSearch,
    hasResults: filteredData.length > 0,
    totalCount: data.length,
    filteredCount: filteredData.length,
  };
} 