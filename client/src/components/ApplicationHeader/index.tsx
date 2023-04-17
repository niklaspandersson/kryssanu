import styled, { StyledFC } from 'styled-components';
import Icon from '../Icon';
import ApplicationMenu from '../ApplicationMenu';
import { useState } from 'react';

const ApplicationHeader: StyledFC = ({ className }) => {
  const [menuVisible, setMenuVisibility] = useState(false);
  return (
    <>
      <header className={className}>
        <button onClick={() => setMenuVisibility(prev => !prev)}>
          <Icon name="menu" />
        </button>
      </header>
      {menuVisible && (
        <ApplicationMenu onClose={() => setMenuVisibility(false)} />
      )}
    </>
  );
};

export default styled(ApplicationHeader)`
  display: flex;
  background: ${({ theme }) => theme.header.background};
  padding: ${({ theme }) => theme.header.padding};
  box-shadow: ${({ theme }) =>
    `0px ${theme.panels.shadow.distance} ${theme.panels.shadow.spread} ${theme.panels.shadow.color}`};
`;
