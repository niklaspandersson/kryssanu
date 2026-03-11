type IconProps = {
  name: string;
  light?: boolean;
  inactive?: boolean;
};

export default function Icon(props: IconProps) {
  return (
    <span
      class={`md-icon ${props.light ? "md-light" : "md-dark"} ${
        props.inactive ? "md-inactive" : ""
      }`}
    >
      {props.name}
    </span>
  );
}
