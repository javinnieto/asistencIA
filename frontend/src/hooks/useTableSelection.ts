import { useState, useMemo } from 'react';

export function useTableSelection<T extends { id: string | number }>(dataList: T[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());

  // Determine if all CURRENT visible items are selected 
  // (useful when you want the "Select All" header checkbox to react to the current page data)
  const isAllSelected = useMemo(() => {
    if (dataList.length === 0) return false;
    return dataList.every(item => selectedIds.has(item.id));
  }, [dataList, selectedIds]);

  const isIndeterminate = useMemo(() => {
    if (dataList.length === 0 || selectedIds.size === 0) return false;
    const someSelected = dataList.some(item => selectedIds.has(item.id));
    return someSelected && !isAllSelected;
  }, [dataList, selectedIds, isAllSelected]);

  // Handle single item selection toggle
  const toggleSelection = (id: string | number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Handle Select All / Deselect All for a specific subset (e.g. current page)
  const toggleSelectAll = () => {
    if (isAllSelected) {
      // Deselect all from the currently visible list
      setSelectedIds(prev => {
        const next = new Set(prev);
        dataList.forEach(item => next.delete(item.id));
        return next;
      });
    } else {
      // Select all in the currently visible list
      setSelectedIds(prev => {
        const next = new Set(prev);
        dataList.forEach(item => next.add(item.id));
        return next;
      });
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const getSelectedItems = (fullDataset: T[]) => {
    return fullDataset.filter(item => selectedIds.has(item.id));
  };

  return {
    selectedIds,
    isAllSelected,
    isIndeterminate,
    toggleSelection,
    toggleSelectAll,
    clearSelection,
    getSelectedItems,
    selectedCount: selectedIds.size
  };
}
