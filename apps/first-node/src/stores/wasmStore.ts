import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WasmStore {
  code: string;
  language: 'typescript' | 'javascript' | 'rust';
  compiledCID: string | null;
  executionHistory: ExecutionRecord[];
  
  setCode: (code: string) => void;
  setLanguage: (language: 'typescript' | 'javascript' | 'rust') => void;
  setCompiledCID: (cid: string | null) => void;
  addExecution: (record: ExecutionRecord) => void;
  clearHistory: () => void;
}

interface ExecutionRecord {
  id: string;
  timestamp: Date;
  cid: string;
  inputs: any;
  output: any;
  success: boolean;
  gasUsed?: number;
  duration?: number;
}

const DEFAULT_CODE = `// Welcome to First Node! 🌀
// Write a pure function to compile to WASM

export function add(a: number, b: number): number {
  return a + b;
}

export function multiply(x: number, y: number): number {
  return x * y;
}

// Try changing the code and see it sync with others!`;

export const useWasmStore = create<WasmStore>()(
  persist(
    (set) => ({
      code: DEFAULT_CODE,
      language: 'typescript',
      compiledCID: null,
      executionHistory: [],
      
      setCode: (code) => set({ code }),
      setLanguage: (language) => set({ language, compiledCID: null }),
      setCompiledCID: (cid) => set({ compiledCID: cid }),
      
      addExecution: (record) =>
        set((state) => ({
          executionHistory: [record, ...state.executionHistory].slice(0, 50), // Keep last 50
        })),
      
      clearHistory: () => set({ executionHistory: [] }),
    }),
    {
      name: 'wasm-store',
      partialize: (state) => ({ 
        language: state.language,
        executionHistory: state.executionHistory 
      }), // Don't persist code or CID
    }
  )
);