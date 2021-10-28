import { useState } from 'react';
import styled, { StyledFC } from 'styled-components';
import { Family } from '../../features/birds';
import Icon from '../Icon';
import Bird from './Bird';
import { useFilteredBirdByFamilies } from '../../features/birds/hooks';

const RawFamilyItemGroup: StyledFC<Family> = ({ name, birds, className }) => {
  const [collapsed, setCollapsed] = useState(false);
  const toggleCollapsed = () => setCollapsed(prev => !prev);
  return (
    <li className={className}>
      <h3>
        {name}{' '}
        <button onClick={toggleCollapsed}>
          <Icon name={collapsed ? 'arrow_right' : 'arrow_drop_down'} />
        </button>
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
    font-weight: 400;
    font-size: 1rem;
    text-transform: lowercase;
    text-align: center;
    margin: 0;
  }
`;

const FamilyList: StyledFC = ({ className }) => {
  const families = useFilteredBirdByFamilies();
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
