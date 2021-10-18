import { ApolloServer } from 'apollo-server';

async function startApolloServer(/*typeDefs, resolvers*/) {
  const server = new ApolloServer({ });
  const { url } = await server.listen();
  console.log(`🚀 Server ready at ${url}`);
}

startApolloServer().then(() => console.log('Done!'));