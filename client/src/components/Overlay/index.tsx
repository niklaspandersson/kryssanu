import styled, { StyledFC } from 'styled-components';
import { useSearch } from '../../features/search';
import Circle from '../Circle';
import Icon from '../Icon';

const FilledCircle = styled(Circle)`
  background: ${({ theme }) => theme.panels.background};
`;

const Overlay: StyledFC = ({ className }) => {
  const { startSearch } = useSearch();

  return (
    <div className={className}>
      <button onClick={startSearch}>
        <FilledCircle size={42}>
          <Icon name="gps_not_fixed" />
        </FilledCircle>
      </button>
    </div>
  );
};

export default styled(Overlay)`
  position: fixed;
  right: ${({ theme }) => theme.panels.padding};
  padding-top: ${({ theme }) => theme.panels.padding};
`;
