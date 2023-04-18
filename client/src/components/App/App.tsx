import styled, { StyledFC } from 'styled-components';
import { useUser } from '../../features/user';
import { Listview, Welcome } from '../../views';

const App: StyledFC = ({ className }) => {
  const user = useUser();
  return <main className={className}>{user ? <Listview /> : <Welcome />}</main>;
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
