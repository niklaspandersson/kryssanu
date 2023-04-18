import styled, { StyledFC } from 'styled-components';
import { useUser } from './features/user';
import Listview from './Listview';
import Welcome from './Welcome';
import { useCallback, useState } from 'react';
import { Bird } from './Listview/types';
import Details from './Details';

const App: StyledFC = ({ className }) => {
  const user = useUser();
  const [selectedBird, setSelectedBird] = useState<Bird | null>(null);
  const onSelectBird = useCallback(
    (bird: Bird) => {
      console.dir(bird);
      setSelectedBird(bird);
    },
    [setSelectedBird]
  );
  return (
    <main className={className}>
      {user ? <Listview onSelectBird={onSelectBird} /> : <Welcome />}
      {selectedBird && (
        <Details onClose={() => setSelectedBird(null)} bird={selectedBird} />
      )}
    </main>
  );
};

export default styled(App)`
  display: grid;
  overflow: hidden;
  grid-template-areas: 'main';
  overflow-y: hidden;

  > * {
    grid-area: main;
  }
`;
