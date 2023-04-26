import { useMemo } from 'react';
import styles from './list.module.css';
import { createServerSideHelpers } from '@trpc/react-query/server';
import type { InferGetStaticPropsType, NextPage } from 'next';
import BirdListItem from '~/components/list/Bird';
import { appRouter } from '~/server/api';
import superjson from 'superjson';
import { prisma } from '~/server/db';
import { api } from '~/utils/api';

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
  const { data } = api.birds.getObservedBirds.useQuery();
  const observedBirds = useMemo(
    () => new Map(data?.map(o => [o.birdId, true])),
    [data?.length]
  );

  return (
    <main>
      <ul className={styles.birds}>
        {birds.map(b => (
          <BirdListItem
            key={b.id}
            observed={observedBirds.has(b.id)}
            bird={b}
          />
        ))}
      </ul>
    </main>
  );
};

export default BirdList;
