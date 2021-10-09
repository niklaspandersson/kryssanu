import styled, { StyledFC } from "styled-components";

type Props = {
  size: number;
}
const Circle: StyledFC<Props> = ({ className, children }) => (
  <div className={className}>
    {children}
  </div>
)

const StyledCircle = styled(Circle)`
  width: ${({size}) => size}px;
  height: ${({size}) => size}px;
  position: relative;
  border: ${({theme}) => theme.circles.border};
  border-radius: ${({size}) => size}px;
`;
export default StyledCircle;

const RawImageCircle: StyledFC<Props & {url: string, alt: string}> = ({className, url, size, alt}) => (
  <StyledCircle className={className} size={size}><img width={size} height={size} src={url} alt={alt} /></StyledCircle>
)

export const ImageCircle = styled(RawImageCircle)`
img {
  opacity: .5;
  border: 0;
  border-radius: ${({size}) => size}px;
}
`;