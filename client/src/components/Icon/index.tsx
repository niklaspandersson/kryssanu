import { createGlobalStyle } from 'styled-components';
type IconProps = {
  name: string;
  light?: boolean;
  inactive?: boolean;
};

export const GlobalIconStyles = createGlobalStyle`
  .md-icon { 
    user-select: none; 
    font-family: 'Material Icons';
    font-weight: normal;
    font-style: normal;
    font-size: 24px;
    line-height: 1;
    letter-spacing: normal;
    text-transform: none;
    display: inline-block;
    white-space: nowrap;
    word-wrap: normal;
    direction: ltr;
    -webkit-font-feature-settings: 'liga';
    font-feature-settings: 'liga';
    -webkit-font-smoothing: antialiased;
  }

  /* Rules for using icons as black on a light background. */
  .material-icons.md-dark { color: rgba(0, 0, 0, 0.54); }
  .material-icons.md-dark.md-inactive { color: rgba(0, 0, 0, 0.26); }

  /* Rules for using icons as white on a dark background. */
  .material-icons.md-light { color: rgba(255, 255, 255, 1); }
  .material-icons.md-light.md-inactive { color: rgba(255, 255, 255, 0.3); }
`;

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
