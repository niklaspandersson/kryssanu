import React from 'react';
import styled, { StyledFC } from "styled-components";
import Icon from '../../components/Icon';

const SearchBar: StyledFC = ({className}) => {
  const [text, setText] = React.useState("");

  return (
    <div className={className}>
      <input type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder="search" />
      <Icon name="gps_off" />
    </div>
  )
};

export default styled(SearchBar)`
  position: relative;
  display: flex;
  justify-content: center;
  flex-flow: row nowrap;
  z-index: 2;
  background: ${({theme}) => theme.panels.background};
  padding: ${({theme}) => theme.panels.padding};
  padding-top: 25px;

  input {
    outline: none;
    text-align: center;
    border-width: 0 0 1px 0;
    font-family: ${({theme}) => theme.typography.family};
    font-size: 1.25rem;
    font-weight: 200;
  }

  .material-icons {
    position: absolute;
    right: 0;
    margin-right: 25px;
  }
`;