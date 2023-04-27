import styles from './[id].module.css';

import type { NextPage } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import type { Bird } from '@prisma/client';
import { api } from '~/utils/api';
import Icon, { Binoculars } from '~/components/Icon';
import IconHeader from '~/components/IconHeader';
import Layout from '~/components/Layout';

type Props = {
  bird: Bird;
};

const Details: React.FC<Props> = ({ bird }) => {
  const { data: observations } = api.birds.getObservations.useQuery({
    birdId: bird.id,
  });
  return (
    <>
      <h3>{bird.swedish}</h3>
      {/* <img src="/bird.png" alt={`Bild av en ${bird.swedish}`} /> */}
      {/* <caption>{'© Folke Foto'}</caption> */}
      <IconHeader icon={<Binoculars />}>Observationer</IconHeader>
      <ul className="observations">
        {observations?.map(o => (
          <li key={o.id}>{o.date.toDateString()}</li>
        ))}
      </ul>
    </>
  );
};

const BirdPage: NextPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const { data: bird } = api.birds.getOne.useQuery({
    birdId: (Array.isArray(id) ? id[0] : id) ?? '',
  });

  return (
    <Layout>
      <div className={styles.details}>
        <header>
          <Link href="/list">
            <Icon name="close" />
          </Link>
        </header>
        {bird && <Details bird={bird} />}
      </div>
    </Layout>
  );
};

export default BirdPage;
