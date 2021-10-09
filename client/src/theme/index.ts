const PaddingComponents = 15;
const theme = {
  panels: {
    padding: `${PaddingComponents}px`,
    background: '#fff',
    shadow: {
      distance: '2px',
      spread: '4px',
      color: 'rgba(0, 0, 0, .2)',
    }
  },
  header: {
    padding: "10px",
  },
  birdList: {
    paddingBetween: `${PaddingComponents}px`,
  },
  circles: {
    border: '1px solid rgba(126, 126, 126, .5)',
  },
  colors: {
    primaryBackground:  '#fefffd',//'#d5e0ca',
    secondaryBackground: '#82AB8B',
  },
  typography: {
    defaultSize: '16px',
    family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";',
    defaultWeight: 400,
    listItem: {
      size: '1.25rem',
      weight: 200,
    }
  }
};

export type Theme = typeof theme;
export default theme;