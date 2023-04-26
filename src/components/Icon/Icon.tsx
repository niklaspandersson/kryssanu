type IconProps = {
  name: string;
  light?: boolean;
  inactive?: boolean;
};

const Icon: React.FC<IconProps> = ({ name: icon, light, inactive }) => (
  <span
    className={`md-icon ${!!light ? 'md-light' : 'md-dark'} ${
      !!inactive ? 'md-inactive' : ''
    }`}
  >
    {icon}
  </span>
);

export default Icon;
