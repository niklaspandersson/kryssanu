import { useEffect, useState, useRef } from 'react';
import styled, { StyledFC } from 'styled-components';
import { useAppDispatch } from '../../app/hooks';
import { useDebounce } from '../../utils';
import Icon from '../../components/Icon';
import { endSearch, search } from './searchSlice';

const SearchBar: StyledFC = ({ className }) => {
  const dispatch = useAppDispatch();
  const [immediate, setImmediate] = useState('');
  const debounced = useDebounce(immediate, 300);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    dispatch(search(debounced));
  }, [debounced, dispatch]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [inputRef]);

  const onClose = () => dispatch(endSearch());
  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="text"
        value={immediate}
        onChange={e => setImmediate(e.target.value)}
        placeholder="search"
      />
      <button onClick={onClose}>
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
