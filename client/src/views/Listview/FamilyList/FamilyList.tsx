import { useState } from 'react';
import styled, { StyledFC } from 'styled-components';
import { Family, SearchState } from '../types';
import Bird from './Bird';
import { useFilteredBirdByFamilies } from '../hooks';

const RawFamilyItemGroup: StyledFC<Family> = ({ name, birds, className }) => {
  const [collapsed, setCollapsed] = useState(false);
  const toggleCollapsed = () => setCollapsed(prev => !prev);
  return (
    <li className={className}>
      <h3>
        <button onClick={toggleCollapsed}>{name}</button>
      </h3>
      <ul>
        {!collapsed && birds.map(bird => <Bird key={bird.id} bird={bird} />)}
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
};

const FamilyList: StyledFC<Props> = ({ filter, className }) => {
  const families = useFilteredBirdByFamilies(filter);
  return (
    <ul className={className}>
      {families.map(({ name, birds }) => (
        <FamilyItemGroup key={name} name={name} birds={birds} />
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
