export type Bird = {
  id: string;
  family: string;
  name: string;
  image?: string;
  observed?: boolean;
  rare?: boolean;
}

export type Family = {
  name: string;
  birds: Bird[];
}

export interface BirdsState {
  birds: Bird[];
  status: 'idle' | 'loading' | 'failed';
}