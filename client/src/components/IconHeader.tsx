import styled, { StyledFC } from 'styled-components';
import Icon from './Icon';

type Props = {
  icon: string;
};

const IconHeader: StyledFC<Props> = ({ icon, children, className }) => {
  return (
    <header className={className}>
      <Icon name={icon} />
      <h2>{children}</h2>
    </header>
  );
};

export default styled(IconHeader)`
  display: flex;
  align-items: center;
  flex-flow: row nowrap;
  margin-top: 1em;

  h2 {
    font-size: 1.2rem;
    font-weight: 400;
    margin: 0 0 0 0.75em;
  }
`;
