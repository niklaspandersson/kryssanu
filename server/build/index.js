"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const apollo_server_koa_1 = require("apollo-server-koa");
const apollo_server_core_1 = require("apollo-server-core");
const type_graphql_1 = require("type-graphql");
const koa_1 = __importDefault(require("koa"));
const koa_jwt_1 = __importDefault(require("koa-jwt"));
const http_1 = __importDefault(require("http"));
const observations_1 = __importDefault(require("./resolvers/observations"));
async function startApolloServer() {
    const httpServer = http_1.default.createServer();
    const schema = await (0, type_graphql_1.buildSchema)({
        resolvers: [observations_1.default],
    });
    const server = new apollo_server_koa_1.ApolloServer({
        schema,
        plugins: [(0, apollo_server_core_1.ApolloServerPluginDrainHttpServer)({ httpServer })],
    });
    await server.start();
    const app = new koa_1.default();
    app.use((0, koa_jwt_1.default)({
        secret: 'my-grpahql-secret',
    }));
    server.applyMiddleware({ app });
    httpServer.on('request', app.callback());
    await new Promise(resolve => httpServer.listen({ port: 4000 }, resolve));
    console.log(`🚀 Server ready at http://localhost:4000${server.graphqlPath}`);
    return { server, app };
}
startApolloServer();
