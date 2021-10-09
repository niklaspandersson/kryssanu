const theme = {
  panels: {
    padding: '10px',
    background: '#fff',
    shadow: {
      distance: '2px',
      spread: '4px',
      color: 'rgba(0, 0, 0, .2)',
    }
  },
  colors: {
    primaryBackground:  '#FEFFFD',
    secondaryBackground: '#82AB8B',
  },
  typography: {
    family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";',
    defaultWeight: '400',
  }
};

export type Theme = typeof theme;
export default theme;