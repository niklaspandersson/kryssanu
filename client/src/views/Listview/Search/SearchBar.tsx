import { useEffect, useState, useRef } from 'react';
import styled, { StyledFC } from 'styled-components';
import { useDebounce } from '../../../utils';
import Icon from '../../../components/Icon';

type Props = {
  onSearch: (str: string) => void;
  onEndSearch: () => void;
};

const SearchBar: StyledFC<Props> = ({ onSearch, onEndSearch, className }) => {
  const [immediate, setImmediate] = useState('');
  const debounced = useDebounce(immediate, 300);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    onSearch(debounced);
  }, [onSearch, debounced]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [inputRef]);

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="text"
        value={immediate}
        onChange={e => setImmediate(e.target.value)}
        placeholder="sök"
      />
      <button onClick={onEndSearch}>
        <Icon name="gps_off" />
      </button>
    </div>
  );
};

export default styled(SearchBar)`
  position: relative;
  display: flex;
  justify-content: center;
  flex-flow: row nowrap;
  z-index: 2;
  background: ${({ theme }) => theme.panels.background};
  padding: ${({ theme }) => theme.panels.padding};
  padding-top: 25px;

  input {
    outline: none;
    text-align: center;
    border-width: 0 0 1px 0;
    font-family: ${({ theme }) => theme.typography.family};
    font-size: 1.25rem;
    font-weight: 200;
  }

  button {
    position: absolute;
    right: 0;
    margin-right: 25px;
  }
`;
