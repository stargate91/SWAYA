import { useState, useEffect, useMemo } from 'react';

export function useOrganizerDetailsState({ sortedRows = [], paginatedRows = [] }) {
  const [activeRowId, setActiveRowId] = useState(null);

  // Sync activeRowId with paginatedRows
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveRowId((current) => (paginatedRows.some((row) => row.id === current) ? current : null));
  }, [paginatedRows]);

  const activeRow = useMemo(
    () => sortedRows.find((row) => row.id === activeRowId) || null,
    [activeRowId, sortedRows]
  );

  return {
    activeRowId,
    setActiveRowId,
    activeRow,
  };
}
