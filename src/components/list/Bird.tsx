import { type Bird } from '@prisma/client';
import Link from 'next/link';
import ImageCheckBox from './ImageCheckBox';

type Props = {
  bird: Bird;
  observed: boolean;
  registerObservation: (birdId: string) => void;
};

const BirdListItem = ({ bird, observed, registerObservation }: Props) => {
  return (
    <li>
      <ImageCheckBox
        observed={observed}
        onClick={() => registerObservation(bird.id)}
      />
      <Link href={`bird/${bird.id}`}>{bird.swedish}</Link>
    </li>
  );
};

export default BirdListItem;
