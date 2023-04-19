import styled, { StyledFC } from 'styled-components';
import { Bird } from '../Listview/types';
import Icon from '../components/Icon';
import IconHeader from '../components/IconHeader';
import Binoculars from '../components/Icon/Binoculars';
import useObservations from './useObservations';

type Props = {
  bird: Bird;
  onClose: () => void;
};
const Details: StyledFC<Props> = ({ bird, onClose, className }) => {
  const observations = useObservations(bird.id);
  return (
    <div className={className}>
      <header>
        <button onClick={onClose}>
          <Icon name="close" />
        </button>
      </header>
      <h3>{bird.name}</h3>
      <img src={bird.image ?? 'bird.jpg'} alt={`Bild av en ${bird.name}`} />
      <caption>{bird.image ?? '© Folke Foto'}</caption>
      <IconHeader icon={<Binoculars />}>Observationer</IconHeader>
      <ul className="observations">
        {observations?.map(o => (
          <li>{o.date}</li>
        ))}
      </ul>
    </div>
  );
};

export default styled(Details)`
  display: flex;
  position: relative;
  flex-flow: column nowrap;
  background: ${({ theme }) => theme.panels.background};

  header {
    padding: ${({ theme }) => theme.header.padding};
  }
  h3 {
    text-transform: capitalize;
    align-self: center;
    font-size: 1.75rem;
    font-weight: 300;
    margin: 0 0 0.5rem 0;
  }
  caption {
    align-self: end;
    font-weight: 200;
    font-style: italic;
    margin: 0.1rem 0.5rem;
  }
  observations {
    flex-grow: 1;
  }
`;
