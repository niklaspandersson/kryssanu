type Props = {
  name: string;
  class?: string;
  size?: number;
};

export default function Icon(props: Props) {
  return (
    <span
      class={`md-icon ${props.class ?? ""}`}
      style={props.size ? { "font-size": `${props.size}px` } : undefined}
    >
      {props.name}
    </span>
  );
}
