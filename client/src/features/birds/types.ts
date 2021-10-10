export type Bird = {
  family: string;
  name: string;
  image?: string;
  observed?: boolean;
}

export type Family = {
  name: string;
  birds: Bird[];
}

export interface BirdsState {
  birds: Bird[];
  status: 'idle' | 'loading' | 'failed';
}