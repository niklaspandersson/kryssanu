import styled, { StyledFC } from 'styled-components';
import Icon from '../Icon';
import IconHeader from '../IconHeader';

type Props = {
  onClose: () => void;
};

const ApplicationMenu: StyledFC<Props> = ({ onClose, className }) => {
  return (
    <div className={className}>
      <button onClick={onClose}>
        <Icon name="close" />
      </button>
      <div>
        <IconHeader icon="format_list_bulleted">Mina listor</IconHeader>
        <ul>
          <li>Test</li>
          <li>test 3</li>
          <li>En till test</li>
          <li>Fjärde</li>
        </ul>
      </div>
      <div>
        <IconHeader icon="person">Test Testsson</IconHeader>
        <ul>
          <li>logga ut</li>
        </ul>
      </div>
      <div>
        <IconHeader icon="info">Information</IconHeader>
        <ul>
          <li>On kryssa.nu</li>
          <li>Credits</li>
        </ul>
      </div>
    </div>
  );
};

export default styled(ApplicationMenu)`
position absolute;
top: 0;
bottom: 0;
left: 0;
font-weight: 200;
z-index: 20;
width: 250px;
flex-flow: column nowrap;
align-items: start;
display: flex;
background: ${({ theme }) => theme.panels.background};
padding: ${({ theme }) => theme.header.padding};

div:nth-child(2) {
  flex-grow: 1;
}

ul {
  list-style-type: none;
  padding-left: 0;
}
li {
  padding: .25rem 0;
}

li:first-child {
  padding-top: 0;
}
`;
