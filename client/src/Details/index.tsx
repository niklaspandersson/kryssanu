import styled, { StyledFC } from 'styled-components';
import { Bird } from '../Listview/types';
import Icon from '../components/Icon';

type Props = {
  bird: Bird;
  onClose: () => void;
};
const Details: StyledFC<Props> = ({ bird, onClose, className }) => {
  return (
    <div className={className}>
      {' '}
      <header className={className}>
        <button onClick={onClose}>
          <Icon name="close" />
        </button>
      </header>
      {bird.id}
    </div>
  );
};

export default styled(Details)`
  display: flex;
  flex-flow: column nowrap;
  background: ${({ theme }) => theme.panels.background};
  padding: ${({ theme }) => theme.panels.padding};
`;
