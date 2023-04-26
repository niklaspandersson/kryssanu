import Icon from '../Icon';
import styles from './ImageCheckBox.module.css';
import clsx from 'clsx';

type Props = {
  observed: boolean;
  onClick: () => void;
};

const ImageCheckBox: React.FC<Props> = ({ observed, onClick }: Props) => {
  return (
    <div
      onClick={onClick}
      className={clsx(styles.container, { [styles.observed!]: observed })}
      style={{ backgroundImage: 'url(/bird-icon.png)' }}
    >
      <Icon name={observed ? 'done' : 'done_outline'} />
    </div>
  );
};

export default ImageCheckBox;
