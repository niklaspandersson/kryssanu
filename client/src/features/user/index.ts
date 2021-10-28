import { useQuery } from "@apollo/client";
import { GET_USER } from "./graphql";

function useUser() {
  const { data } = useQuery(GET_USER);
  return data?.user;
}

export { useUser };