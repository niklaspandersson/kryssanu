import React from 'react';
import ReactDOM from 'react-dom';
import { ThemeProvider, createGlobalStyle } from 'styled-components';
import { GlobalIconStyles } from './components/Icon';
import App from './components/App';
import defaultTheme from './theme';
import { store } from './app/store';
import { Provider } from 'react-redux';
import * as serviceWorker from './serviceWorker';

const GlobalStyles = createGlobalStyle`
body {
  margin: 0;
  background: ${({theme}) => theme.colors.primaryBackground};
  font-family: ${({theme}) => theme.typography.family};
  font-weight: ${({theme}) => theme.typography.defaultWeight};
  font-size: ${({theme}) => theme.typography.defaultSize};
}
`;

ReactDOM.render(
  <React.StrictMode>
    <Provider store={store}>
      <ThemeProvider theme={defaultTheme}>
        <GlobalStyles />
        <GlobalIconStyles />
        <App />
      </ThemeProvider>
    </Provider>
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
