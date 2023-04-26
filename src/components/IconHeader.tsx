import styles from './IconHeader.module.css';
import Icon from './Icon';

type Props = {
  icon: string | JSX.Element;
};

const IconHeader: React.FC<React.PropsWithChildren<Props>> = ({
  icon,
  children,
}) => {
  return (
    <header className={styles.iconHeader}>
      {typeof icon === 'string' ? <Icon name={icon} /> : icon}
      <h2>{children}</h2>
    </header>
  );
};

export default IconHeader;
