import { useState } from "react";
import styled, { StyledFC } from "styled-components";
import { useLongPress } from "use-long-press";

type Props = {
  threshold?: number;
  checked?: boolean;
  onLongPress: () => void;
};

const LongPressButton: StyledFC<Props> = ({
  className,
  children,
  checked,
  onLongPress,
  threshold = 1000,
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const binds = useLongPress(
    () => {
      setIsPressed(false);
      onLongPress();
    },
    {
      onStart: () => setIsPressed(true),
      onCancel: () => setIsPressed(false),
      threshold,
    }
  );

  return (
    <button
      className={`lp-button ${className} ${isPressed ? "pressed" : ""} ${
        checked ? "toggled" : ""
      }`}
      {...binds}
    >
      {children}
    </button>
  );
};

export default styled(LongPressButton)`
  transition: color 0s;
  user-select: none;

  &.pressed {
    transition: color 1s cubic-bezier(0.61, 0.35, 0.94, 0.63);
  }

  &.toggled {
    transition: color 0s;
  }
`;
