import type { NextPage } from 'next';
import { useRouter } from 'next/router';

const BirdPage: NextPage = () => {
  const router = useRouter();
  const { id } = router.query;

  return (
    <main>
      <span>{id}</span>
    </main>
  );
};

export default BirdPage;
