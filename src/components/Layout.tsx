import styles from './Layout.module.css';

const Layout: React.FC<React.PropsWithChildren> = ({ children }) => {
  return (
    <main className={styles.main}>
      <div className={styles.container}>{children}</div>
    </main>
  );
};

export default Layout;
