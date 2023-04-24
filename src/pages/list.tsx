import { type NextPage } from 'next';

import { api } from '~/utils/api';

const Home: NextPage = () => {
  const res = api.birds.getAll.useQuery();
  if (!res.data) return <main></main>;

  return (
    <main>
      {res.data?.map(b => (
        <span key={b.id}>{b.swedish}</span>
      ))}
    </main>
  );
};

export default Home;
