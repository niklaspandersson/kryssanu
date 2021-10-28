import styled, { StyledFC } from 'styled-components';
import { useFilteredBirds } from '../../features/birds/hooks';
import Bird from './Bird';

const BirdList: StyledFC = ({ className }) => {
  const birds = useFilteredBirds();
  return (
    <ul className={className}>
      {birds.map(bird => (
        <Bird key={bird.name} bird={bird} />
      ))}
    </ul>
  );
};

export default styled(BirdList)`
  padding: ${({ theme }) => theme.panels.padding};
  margin: 0;
  font-size: ${({ theme }) => theme.typography.listItem.size};
  font-weight: ${({ theme }) => theme.typography.listItem.weight};
  overflow-y: auto;
`;
