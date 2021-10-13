import styled, { StyledFC } from "styled-components";
import { Bird } from "../../features/birds";
import { ImageCircle } from "../Circle";
import Icon from "../Icon";
import LongPressButton from "../LongPressButton";

const LongPressCheckButton = styled(LongPressButton)`
  z-index: 10;
  & .md-icon {
    font-size: 60px;
    position: relative;
    left: 7px;
    bottom: 4px;
    color: transparent;
    transition: color 0s;
  }
  
  &.pressed .md-icon {
    color: green;
    transition: color 1s cubic-bezier(.61,.35,.94,.63);

  }

  &.toggled .md-icon {
    color: #146812;
    transition: color 0s;
  }`;

type CheckProps = {
  checked: boolean;
  imageUrl: string;
}
const CheckBox: StyledFC<CheckProps> = ({className, checked, imageUrl }) => (
  <div className={className}>
    <LongPressCheckButton checked={checked}>
      <Icon name="check" />
    </LongPressCheckButton>
    <ImageCircle size={52} url="bird.jpg" alt={imageUrl} />
  </div>
);
const StyledCheckBox = styled(CheckBox)`
  position: relative;
  & > .circle {
    position: relative;
  }
  & > .lp-button {
    position: absolute;
    display: flex;
    width: 52px;
    height: 52px;
    align-items: center;
    justify-content: center;
  }
`;

type Props = {
  bird: Bird;
}
const ListItem: StyledFC<Props> = ({className, bird}) => (
  <li className={className}>
    <StyledCheckBox imageUrl="bird.jpg" checked={false} />
    <span className="name">{bird.name}</span>
  </li>
);

export default styled(ListItem)`
  display: flex;
  margin-bottom: ${({theme}) => theme.birdList.paddingBetween};
  list-style-type: none;
  align-items: center;

  span.name {
    padding-left: ${({theme}) => theme.birdList.paddingBetween};
  }
`;