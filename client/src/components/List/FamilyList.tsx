import styled, { StyledFC } from "styled-components";
import { useAppSelector } from "../../app/hooks";
import { selectBirdsByFamily } from "../../features/birds";
import { Family } from "../../features/birds";
import Item from "./ListItem";

const RawFamilyItemGroup : StyledFC<Family> = ({name, birds, className}) => {
  return (
    <li className={className}>
      <h3>{name}</h3>
      <ul>
        {birds.map(bird => <Item key={bird.name} bird={bird} />)}
      </ul>
    </li>
  )
};
const FamilyItemGroup = styled(RawFamilyItemGroup)`
  list-style-type: none;
  ul {
    margin: 0;
    padding: 0;
  }
`;

const FamilyList : StyledFC = ({className}) => {
  const families = useAppSelector(selectBirdsByFamily);

  return (
    <ul className={className}>
      {families.map(({name, birds}) => <FamilyItemGroup key={name} name={name} birds={birds} />)}
    </ul>
  );
};

export default styled(FamilyList)`
padding: ${({theme}) => theme.panels.padding};
margin: 0;
list-style-type: none;
font-size: ${({theme}) => theme.typography.listItem.size};
font-weight: ${({theme}) => theme.typography.listItem.weight};
overflow-y: auto;
`;