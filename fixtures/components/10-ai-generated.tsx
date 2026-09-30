/**
 * Fixture: 10-ai-generated.tsx
 * Exercises: the representative "pasted from an AI chat" component — mixed
 * unresolved imports, no surrounding project, several dependency kinds at
 * once (ui-component, hook, utility). This is the fixture most representative
 * of Convat's actual target use case (PRD §2b).
 * Expected status: PARTIAL
 */

import { useState, useEffect } from "react";
import { useDebounce } from "./hooks/useDebounce";
import { SearchIcon } from "./icons/SearchIcon";
import { formatResultCount } from "./utils/formatResultCount";

interface SearchBoxProps {
  placeholder: string;
  onSearch: (query: string) => void;
  resultCount: number;
}

export default function SearchBox({
  placeholder,
  onSearch,
  resultCount,
}: SearchBoxProps) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (debouncedQuery) {
      onSearch(debouncedQuery);
    }
  }, [debouncedQuery, onSearch]);

  return (
    <div className="convat-search-box">
      <SearchIcon />
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
      />
      <span>{formatResultCount(resultCount)}</span>
    </div>
  );
}
