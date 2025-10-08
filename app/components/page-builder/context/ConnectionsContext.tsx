'use client';

import React, { createContext, useContext, useReducer, ReactNode } from 'react';

// Типы для системы связей
export interface FilterConnection {
  id: string;
  sourceElementId: string;
  targetElementId: string;
  connectionType: 'filter' | 'data' | 'cart' | 'navigate';
  sourceProperty?: string;
  targetProperty?: string;
  isActive: boolean;
}

export interface FilterState {
  [elementId: string]: {
    propertyName: string;
    value: string;
    categoryIds: string[];
  };
}

export interface ConnectionsState {
  connections: FilterConnection[];
  filterStates: FilterState;
  globalFilters: {
    [propertyName: string]: string;
  };
}

// Действия для управления связями (упрощенные)
type ConnectionsAction =
  | { type: 'SET_FILTER'; propertyName: string; value: string; categoryIds: string[] }
  | { type: 'CLEAR_FILTER'; propertyName: string }
  | { type: 'RESET_FILTERS' };

// Начальное состояние
const initialState: ConnectionsState = {
  connections: [],
  filterStates: {},
  globalFilters: {}
};

// Редьюсер для управления состоянием (упрощенный)
function connectionsReducer(state: ConnectionsState, action: ConnectionsAction): ConnectionsState {
  switch (action.type) {
    case 'SET_FILTER':
      return {
        ...state,
        globalFilters: {
          ...state.globalFilters,
          [action.propertyName]: action.value
        }
      };
    case 'CLEAR_FILTER':
      const newFilters = { ...state.globalFilters };
      delete newFilters[action.propertyName];
      return { ...state, globalFilters: newFilters };
    case 'RESET_FILTERS':
      return { ...state, globalFilters: {} };
    default:
      return state;
  }
}

// Контекст (упрощенный)
const ConnectionsContext = createContext<{
  state: ConnectionsState;
  dispatch: React.Dispatch<ConnectionsAction>;
  setFilter: (propertyName: string, value: string, categoryIds: string[]) => void;
  clearFilter: (propertyName: string) => void;
  resetFilters: () => void;
  getFilterValue: (propertyName: string) => string | undefined;
} | null>(null);

// Провайдер контекста (упрощенный)
export function ConnectionsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(connectionsReducer, initialState);

  const setFilter = (propertyName: string, value: string, categoryIds: string[]) => {
    dispatch({ type: 'SET_FILTER', propertyName, value, categoryIds });
  };

  const clearFilter = (propertyName: string) => {
    dispatch({ type: 'CLEAR_FILTER', propertyName });
  };

  const resetFilters = () => {
    dispatch({ type: 'RESET_FILTERS' });
  };

  const getFilterValue = (propertyName: string) => {
    return state.globalFilters[propertyName];
  };

  return (
    <ConnectionsContext.Provider value={{
      state,
      dispatch,
      setFilter,
      clearFilter,
      resetFilters,
      getFilterValue
    }}>
      {children}
    </ConnectionsContext.Provider>
  );
}

// Хук для использования контекста
export function useConnections() {
  const context = useContext(ConnectionsContext);
  if (!context) {
    throw new Error('useConnections must be used within a ConnectionsProvider');
  }
  return context;
}

// Хук для управления фильтрами (упрощенный)
export function useFilterConnection(propertyName: string) {
  const { state, setFilter, clearFilter, getFilterValue } = useConnections();
  
  return {
    value: getFilterValue(propertyName),
    setValue: (value: string, categoryIds: string[] = []) => setFilter(propertyName, value, categoryIds),
    clearValue: () => clearFilter(propertyName),
    globalFilters: state.globalFilters
  };
}
