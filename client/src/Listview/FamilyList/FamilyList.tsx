import { useState } from 'react';
import styled, { StyledFC } from 'styled-components';
import { Bird, Family, SearchState } from '../types';
import BirdListItem from './Bird';
import { useFilteredBirdByFamilies } from '../hooks';

type FamilyProps = {
  onSelectBird: (bird: Bird) => void;
};

const RawFamilyItemGroup: StyledFC<Family & FamilyProps> = ({
  onSelectBird,
  name,
  birds,
  className,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const toggleCollapsed = () => setCollapsed(prev => !prev);
  return (
    <li className={className}>
      <h3>
        <button onClick={toggleCollapsed}>{name}</button>
      </h3>
      <ul>
        {!collapsed &&
          birds.map(bird => (
            <BirdListItem select={onSelectBird} key={bird.id} bird={bird} />
          ))}
      </ul>
    </li>
  );
};
const FamilyItemGroup = styled(RawFamilyItemGroup)`
  list-style-type: none;
  ul {
    margin: 0;
    padding: 0;
  }

  h3 {
    justify-content: center;
    display: flex;
    align-items: center;
    font-weight: 200;
    font-size: 1rem;
    text-transform: lowercase;
    text-align: center;
    margin: 0;
  }
`;

type Props = {
  filter: SearchState;
  onSelectBird: (bird: Bird) => void;
};

const FamilyList: StyledFC<Props> = ({ onSelectBird, filter, className }) => {
  const families = useFilteredBirdByFamilies(filter);
  return (
    <ul className={className}>
      {families.map(({ name, birds }) => (
        <FamilyItemGroup
          onSelectBird={onSelectBird}
          key={name}
          name={name}
          birds={birds}
        />
      ))}
    </ul>
  );
};

export default styled(FamilyList)`
  padding: ${({ theme }) => theme.panels.padding};
  margin: 0;
  list-style-type: none;
  font-size: ${({ theme }) => theme.typography.listItem.size};
  font-weight: ${({ theme }) => theme.typography.listItem.weight};
  overflow-y: auto;
`;
