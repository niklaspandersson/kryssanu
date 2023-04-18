import { StyledFC } from 'styled-components';
import Icon from '../../components/Icon';

type Props = {
  showMenu: () => void;
};

const ApplicationHeader: StyledFC<Props> = ({ showMenu, className }) => {
  return (
    <header className={className}>
      <button onClick={showMenu}>
        <Icon name="menu" />
      </button>
    </header>
  );
};

export default ApplicationHeader;
