import { A } from "@solidjs/router";
import type { Bird } from "@kryssanu/shared";
import ImageCheckBox from "./ImageCheckBox";

type Props = {
  bird: Bird;
  observed: boolean;
  registerObservation: (birdId: string) => void;
};

export default function BirdListItem(props: Props) {
  return (
    <li>
      <ImageCheckBox
        observed={props.observed}
        onClick={() => props.registerObservation(props.bird.id)}
      />
      <A href={`/bird/${props.bird.id}`}>{props.bird.swedish}</A>
    </li>
  );
}
