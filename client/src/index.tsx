import React from 'react';
import ReactDOM from 'react-dom';
import { ThemeProvider, createGlobalStyle } from 'styled-components';
import { GlobalIconStyles } from './components/Icon';
import App from './components/App';
import defaultTheme from './theme';
import { ApolloProvider } from '@apollo/client';
import * as serviceWorker from './serviceWorker';
import client from './apollo';

const GlobalStyles = createGlobalStyle`
body {
  margin: 0;
  background: ${({ theme }) => theme.colors.primaryBackground};
  font-family: ${({ theme }) => theme.typography.family};
  font-weight: ${({ theme }) => theme.typography.defaultWeight};
  font-size: ${({ theme }) => theme.typography.defaultSize};

  #root {
    width: 100vw;
    height: 100vh;
    display: grid;
  }

  button {
    border: none;
    background: transparent;
    padding: 0;
    margin: 0;
    display: inline-flex;
  }
}
`;
window.onload = () => {
  ReactDOM.render(
    <React.StrictMode>
      <ApolloProvider client={client}>
        <ThemeProvider theme={defaultTheme}>
          <GlobalStyles />
          <GlobalIconStyles />
          <App />
        </ThemeProvider>
      </ApolloProvider>
    </React.StrictMode>,
    document.getElementById('root')
  );
};

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
