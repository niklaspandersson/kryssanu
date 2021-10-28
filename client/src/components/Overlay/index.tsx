import styled, { StyledFC } from 'styled-components';
import { useAppDispatch } from '../../app/hooks';
import { startSearch } from '../../features/search/searchSlice';
import Circle from '../Circle';
import Icon from '../Icon';

const FilledCircle = styled(Circle)`
  background: ${({ theme }) => theme.panels.background};
`;

const Overlay: StyledFC = ({ className }) => {
  const dispatch = useAppDispatch();

  const showSearchBar = () => {
    dispatch(startSearch());
  };

  return (
    <div className={className}>
      <button onClick={showSearchBar}>
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
