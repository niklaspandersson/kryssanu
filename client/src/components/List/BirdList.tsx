import styled, { StyledFC } from "styled-components";
import { useAppSelector } from "../../app/hooks";
import { selectBirds } from "../../features/birds";
import Item from "./ListItem";

const BirdList : StyledFC = ({className}) => {
  const birds = useAppSelector(selectBirds);

  return (
    <ul className={className}>
      {birds.map((bird) => <Item key={bird.name} bird={bird} />)}
    </ul>
  );
};

export default styled(BirdList)`
padding: ${({theme}) => theme.panels.padding};
margin: 0;
font-size: ${({theme}) => theme.typography.listItem.size};
font-weight: ${({theme}) => theme.typography.listItem.weight};
overflow-y: auto;
`;