import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type DocumentSession = {
  session_id: string;
  document_count: number;
} | null;

type DocumentSessionStore = {
  documentSession: DocumentSession;
  setDocumentSession: (session: DocumentSession) => void;
  clearSession: () => Promise<void>;
};

export const useDocumentSessionStore = create<DocumentSessionStore>()(
  persist(
    (set, get) => ({
      documentSession: null,

      setDocumentSession: (session) => set({ documentSession: session }),

      clearSession: async () => {
        const session = get().documentSession;
        if (!session?.session_id) return;

        try {
          const response = await fetch(`http://localhost:8000/session/${session.session_id}`, {
            method: 'DELETE',
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error('Failed to delete session:', errorText);
          } else {
            console.log(`Session ${session.session_id} deleted`);
          }
        } catch (err) {
          console.error('Error calling delete session:', err);
        }

        set({ documentSession: null });
      },
    }),
    {
      name: 'document-session-storage',
      storage: {
        getItem: (name) => {
          const item = sessionStorage.getItem(name);
          return item ? JSON.parse(item) : null;
        },
        setItem: (name, value) => {
          sessionStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => {
          sessionStorage.removeItem(name);
        },
      },
    }
  )
);
