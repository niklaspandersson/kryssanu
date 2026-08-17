type Props = {
  name: string;
  class?: string;
  size?: number;
  /** Tooltip text; also read out as the icon's accessible name. */
  title?: string;
};

export default function Icon(props: Props) {
  return (
    <span
      class={`md-icon ${props.class ?? ""}`}
      style={props.size ? { "font-size": `${props.size}px` } : undefined}
      title={props.title}
      aria-label={props.title}
      role={props.title ? "img" : undefined}
    >
      {props.name}
    </span>
  );
}
