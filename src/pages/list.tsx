import styles from './list.module.css';
import { createServerSideHelpers } from '@trpc/react-query/server';
import type { InferGetStaticPropsType, NextPage } from 'next';
import BirdListItem from '~/components/list/Bird';
import { appRouter } from '~/server/api';
import superjson from 'superjson';
import { prisma } from '~/server/db';
import { api } from '~/utils/api';
import Header from '~/components/list/Header';
import Layout from '../components/Layout';
import useCreateObservationMutation from '~/components/useCreateObservationMutation';

const helper = createServerSideHelpers({
  router: appRouter,
  ctx: { prisma, session: null },
  transformer: superjson, // optional - adds superjson serialization
});

export async function getStaticProps() {
  const birds = await helper.birds.getAll.fetch();
  return {
    props: {
      birds,
    },
  };
}

const BirdList: NextPage<InferGetStaticPropsType<typeof getStaticProps>> = ({
  birds,
}) => {
  const { data: observedBirds } = api.birds.getObservedBirds.useQuery();

  const createObservation = useCreateObservationMutation();

  const onRegisterObservation = (birdId: string) => {
    createObservation
      .mutateAsync({ birdId })
      .then(console.log)
      .catch(console.error);
  };

  return (
    <Layout>
      <Header />
      <ul className={styles.birds}>
        {birds.map(b => (
          <BirdListItem
            registerObservation={onRegisterObservation}
            key={b.id}
            observed={observedBirds?.[b.id] ?? false}
            bird={b}
          />
        ))}
      </ul>
    </Layout>
  );
};

export default BirdList;
