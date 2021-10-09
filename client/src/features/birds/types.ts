export type Bird = {
  family?: string;
  name: string;
  image?: string;
  observed?: boolean;
}

export interface BirdsState {
  birds: Bird[];
  status: 'idle' | 'loading' | 'failed';
}