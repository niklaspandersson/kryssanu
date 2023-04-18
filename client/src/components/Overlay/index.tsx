import styled, { StyledFC } from 'styled-components';
import Circle from '../Circle';
import Icon from '../Icon';

const FilledCircle = styled(Circle)`
  background: ${({ theme }) => theme.panels.background};
`;

type Props = {
  onStartSearch: () => void;
};
const Overlay: StyledFC<Props> = ({ onStartSearch, className }) => {
  return (
    <div className={className}>
      <button onClick={onStartSearch}>
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
