import styled, { StyledFC } from "styled-components";
import Circle from '../Circle';
import Icon from "../Icon";

const Overlay: StyledFC = ({className}) => (
  <div className={className}>
    <Circle size={42}>
      <Icon name="gps_not_fixed" />
    </Circle>
  </div>
)

export default styled(Overlay)`
  position: fixed;
  right: ${({theme}) => theme.panels.padding};
  padding-top: ${({theme}) => theme.panels.padding};
`;