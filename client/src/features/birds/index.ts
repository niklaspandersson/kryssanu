import birdsReducer from './birdsSlice';
import { RootState } from '../../app/store';

export function selectBirdsByFamily(state:RootState) {

}

export type { Bird } from './types';
export default birdsReducer;