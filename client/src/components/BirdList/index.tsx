import { useEffect } from "react";
import styled, { StyledFC } from "styled-components";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { fetchAllAsync  } from "../../features/birds/birdsSlice";
import Item from "./ListItem";

const BirdList : StyledFC = ({className}) => {
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(fetchAllAsync());
  }, [dispatch]);

  const { birds } = useAppSelector(s => s.birds);

  return (
    <ul className={className}>
      {birds.map((bird) => <Item key={bird.name} bird={bird} />)}
    </ul>
  );
};

export default styled(BirdList)`
padding: ${({theme}) => theme.panels.padding};
margin: 0;
font-size: ${({theme}) => theme.typography.listItem.size};
font-weight: ${({theme}) => theme.typography.listItem.weight};
`;