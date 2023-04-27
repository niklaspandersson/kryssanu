import styles from './Header.module.css';
import Icon from '../Icon';

type Props = {
  showMenu?: () => void;
};

const Header = ({ showMenu }: Props) => {
  return (
    <header className={styles.header}>
      <button className={styles.button} onClick={showMenu}>
        <Icon name="menu" />
      </button>
    </header>
  );
};

export default Header;
