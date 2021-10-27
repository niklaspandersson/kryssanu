import styled, { StyledFC } from "styled-components";
import Icon from '../Icon';


const ApplicationHeader : StyledFC = ({className}) => {
  const test = () => fetch('/test/');
  return (
    <header className={className}>
      <Icon name='menu' />
      <button onClick={test}>test</button>
    </header>
  );
}

export default styled(ApplicationHeader)`
  display: flex;
  background: ${({theme}) => theme.header.background};
  padding: ${({theme}) => theme.header.padding};
  box-shadow: ${({theme}) => `0px ${theme.panels.shadow.distance} ${theme.panels.shadow.spread} ${theme.panels.shadow.color}`};
`;