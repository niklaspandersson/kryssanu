import { type Bird } from '@prisma/client';
import Link from 'next/link';

type Props = {
  bird: Bird;
};

const BirdListItem = ({ bird }: Props) => {
  return (
    <li>
      <img width="52" height="52" src="bird.png" alt="Image of a bird" />
      <Link href={`bird/${bird.id}`}>{bird.swedish}</Link>
    </li>
  );
};

export default BirdListItem;
