import { api } from '~/utils/api';

const useCreateObservationMutation = () => {
  const utils = api.useContext();

  const createObservation = api.birds.registerObservation.useMutation({
    onSuccess(input) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      utils.birds.getObservedBirds.setData(undefined, oldData => {
        console.log(oldData);
        return oldData ? { ...oldData, [input.birdId]: true } : undefined;
      });
    },
  });

  return createObservation;
};

export default useCreateObservationMutation;
