"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const apollo_server_1 = require("apollo-server");
const type_graphql_1 = require("type-graphql");
const observations_1 = __importDefault(require("./resolvers/observations"));
async function startApolloServer() {
    const schema = await (0, type_graphql_1.buildSchema)({
        resolvers: [observations_1.default],
    });
    const server = new apollo_server_1.ApolloServer({ schema });
    const { url } = await server.listen();
    console.log(`🚀 Server ready at ${url}`);
}
startApolloServer().then(() => console.log('Done!'));
