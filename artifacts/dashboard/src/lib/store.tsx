import React, { createContext, useContext, useReducer, useCallback } from "react";
import { MOCK_DOCUMENTS, type Document } from "./mock-data";

interface State {
  documents: Document[];
}

type Action =
  | { type: "ADD_DOCUMENT"; doc: Document }
  | { type: "UPDATE_DOCUMENT"; id: string; updates: Partial<Document> }
  | { type: "REMOVE_DOCUMENT"; id: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "ADD_DOCUMENT":
      return { documents: [action.doc, ...state.documents] };
    case "UPDATE_DOCUMENT":
      return {
        documents: state.documents.map(d =>
          d.id === action.id ? { ...d, ...action.updates } : d
        ),
      };
    case "REMOVE_DOCUMENT":
      return { documents: state.documents.filter(d => d.id !== action.id) };
    default:
      return state;
  }
}

interface StoreCtx {
  documents: Document[];
  addDocument: (doc: Document) => void;
  updateDocument: (id: string, updates: Partial<Document>) => void;
  removeDocument: (id: string) => void;
}

const DocumentContext = createContext<StoreCtx | null>(null);

export function DocumentProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { documents: MOCK_DOCUMENTS });

  const addDocument = useCallback((doc: Document) => {
    dispatch({ type: "ADD_DOCUMENT", doc });
  }, []);

  const updateDocument = useCallback((id: string, updates: Partial<Document>) => {
    dispatch({ type: "UPDATE_DOCUMENT", id, updates });
  }, []);

  const removeDocument = useCallback((id: string) => {
    dispatch({ type: "REMOVE_DOCUMENT", id });
  }, []);

  return (
    <DocumentContext.Provider value={{ documents: state.documents, addDocument, updateDocument, removeDocument }}>
      {children}
    </DocumentContext.Provider>
  );
}

export function useDocuments(): StoreCtx {
  const ctx = useContext(DocumentContext);
  if (!ctx) throw new Error("useDocuments must be used within DocumentProvider");
  return ctx;
}
