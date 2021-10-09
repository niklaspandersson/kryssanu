import React from 'react';
import { Theme } from './theme';

// import original module declarations
import 'styled-components';

// and extend them!
declare module 'styled-components' {
  export type StyledFC<P = {}> = React.FunctionComponent<P & { className?: string}>;
  export interface DefaultTheme extends Theme {};
}