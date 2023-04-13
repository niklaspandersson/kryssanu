# kryssanu

## How to develop
1. Create a `.env` file in the project root and populate the following variables:
    * DEV_DB_USER
    * DEV_DB_PASSWORD
    * DEV_USER_ID
2. Start the provided docker compose file. It will run both the frontend and the backend in watch mode. It will also run a mongodb instance and a mongodb web-ui.
3. Access:
    * Frontend at http://localhost:3000
    * Backend graphQL playground at http://localhost:8000/graphql
    * Mongodb web UI at http://localhost:8081
4. If this is the first time, create a test user in the database
    1. Access the mongbdb web ui.
    2. View the `kryssanu` database
    3. View the `users` collection
    4. Add a new document containing the following attributes:
        * `name` (string)
        * `createdAt` (date string)
        * `lastLoggedInAt` (date string)
    5. Copy the _id and use in the DEV_USER_ID environment variable.
    6. Restart the backend service.