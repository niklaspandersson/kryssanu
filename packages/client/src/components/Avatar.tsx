import styles from "./Avatar.module.css";

type Props = {
  name: string | null;
  image: string | null;
  size?: number;
};

export default function Avatar(props: Props) {
  const initials = () => {
    const n = props.name || "?";
    return n
      .split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <div
      class={styles.avatar}
      style={{
        width: `${props.size ?? 36}px`,
        height: `${props.size ?? 36}px`,
        "font-size": `${(props.size ?? 36) * 0.4}px`,
      }}
    >
      {props.image ? (
        <img
          src={props.image}
          alt={props.name || "Avatar"}
          class={styles.image}
          referrerpolicy="no-referrer"
        />
      ) : (
        <span class={styles.initials}>{initials()}</span>
      )}
    </div>
  );
}
