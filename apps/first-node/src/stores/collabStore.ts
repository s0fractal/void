import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CollabStore {
  roomName: string;
  userName: string;
  participants: Participant[];
  
  setRoomName: (name: string) => void;
  setUserName: (name: string) => void;
  updateParticipants: (participants: Participant[]) => void;
}

interface Participant {
  sid: string;
  identity: string;
  name: string;
  isSpeaking: boolean;
  isLocal: boolean;
  metadata?: {
    role?: string;
    canExecuteWasm?: boolean;
  };
}

export const useCollabStore = create<CollabStore>()(
  persist(
    (set) => ({
      roomName: '',
      userName: '',
      participants: [],
      
      setRoomName: (roomName) => set({ roomName }),
      setUserName: (userName) => set({ userName }),
      updateParticipants: (participants) => set({ participants }),
    }),
    {
      name: 'collab-store',
      partialize: (state) => ({ 
        userName: state.userName // Only persist username
      }),
    }
  )
);