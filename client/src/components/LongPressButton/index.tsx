import { useState } from 'react';
import styled, { StyledFC } from 'styled-components';
import { useLongPress } from "use-long-press";

type Props = {
  threshold?: number,
  checked?: boolean,
};

const LongPressButton:StyledFC<Props> = ({ className, children, checked, threshold = 1000 }) => {
  const [isPressed, setIsPressed] = useState(false);
  const [isToggled, setIsToggled] = useState(!!checked);
  const binds = useLongPress(() => {
    setIsPressed(false);
    setIsToggled(true);
  }, {
    onStart: () => { setIsPressed(true); console.log('pressed!') },
    onCancel: () => setIsPressed(false),
    threshold,
  });

  return (
    <button className={`lp-button ${className} ${isPressed ? 'pressed' : ''} ${isToggled ? 'toggled' : ''}`} {...binds}>{children}</button>
  );
}

export default styled(LongPressButton)`
  transition: color 0s;
  user-select: none;

  &.pressed {
    transition: color 1s cubic-bezier(.61,.35,.94,.63);
  }

  &.toggled {
    transition: color 0s;
  }
`;