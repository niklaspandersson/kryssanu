import styled, { StyledFC } from 'styled-components';
import { Bird } from '../types';
import { ImageCircle } from '../../../components/Circle';
import Icon from '../../../components/Icon';
import LongPressButton from '../../../components/LongPressButton';
import { useRegisterObservation } from '../hooks';
import { useCallback } from 'react';

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
    transition: color 1s cubic-bezier(0.61, 0.35, 0.94, 0.63);
  }

  &.toggled .md-icon {
    color: #14681275;
    transition: color 0s;
  }
`;

type CheckProps = {
  checked: boolean;
  onChecked: () => void;
  imageUrl: string;
};
const CheckBox: StyledFC<CheckProps> = ({
  className,
  checked,
  imageUrl,
  onChecked,
}) => (
  <div className={className}>
    <LongPressCheckButton checked={checked} onLongPress={onChecked}>
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
  select?: (bird: Bird) => void;
};
const BirdListItem: StyledFC<Props> = ({ select, className, bird }) => {
  const onClick = useCallback(() => {
    select?.(bird);
  }, [bird, select]);

  const registerObservation = useRegisterObservation(bird.id);
  return (
    <li className={className}>
      <StyledCheckBox
        imageUrl="bird.jpg"
        checked={!!bird.observed}
        onChecked={registerObservation}
      />
      <span onClick={onClick} className="name">
        {bird.name}
      </span>
    </li>
  );
};

export default styled(BirdListItem)`
  display: flex;
  margin-bottom: ${({ theme }) => theme.birdList.paddingBetween};
  list-style-type: none;
  align-items: center;

  span.name {
    padding-left: ${({ theme }) => theme.birdList.paddingBetween};
  }
`;
