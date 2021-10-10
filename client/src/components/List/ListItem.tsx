import styled, { StyledFC } from "styled-components";
import { Bird } from "../../features/birds";
import { ImageCircle } from "../Circle";

type Props = {
  bird: Bird;
}

const ListItem: StyledFC<Props> = ({className, bird}) => (
  <li className={className}><ImageCircle size={52} url="bird.jpg" alt={bird.name} /><span>{bird.name}</span></li>
);

export default styled(ListItem)`
  display: flex;
  margin-bottom: ${({theme}) => theme.birdList.paddingBetween};
  list-style-type: none;
  align-items: center;

  span {
    padding-left: ${({theme}) => theme.birdList.paddingBetween};
    text-transform: capitalize;
  }
`;