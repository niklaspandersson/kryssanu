"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
const type_graphql_1 = require("type-graphql");
const models_1 = require("../models");
const TestObservations = [
    {
        userId: 'testUser',
        birdId: 'pica pica',
        date: new Date('2021-01-01'),
    },
    {
        userId: 'testUser',
        birdId: 'grus grus',
        date: new Date('2021-02-01'),
    },
];
let AddObservationInput = class AddObservationInput {
};
__decorate([
    (0, type_graphql_1.Field)(),
    __metadata("design:type", String)
], AddObservationInput.prototype, "birdId", void 0);
__decorate([
    (0, type_graphql_1.Field)({ nullable: true }),
    __metadata("design:type", Number)
], AddObservationInput.prototype, "listId", void 0);
AddObservationInput = __decorate([
    (0, type_graphql_1.InputType)()
], AddObservationInput);
let ObservationResolver = class ObservationResolver {
    async observations() {
        return Promise.resolve(TestObservations);
    }
    async addObservation(newObservationData) {
        // sample implementation
        const observation = {
            ...newObservationData,
            date: new Date(),
            userId: 'testUser',
        };
        TestObservations.push(observation);
        return observation;
    }
};
__decorate([
    (0, type_graphql_1.Query)(() => [models_1.Observation]),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ObservationResolver.prototype, "observations", null);
__decorate([
    (0, type_graphql_1.Mutation)(() => models_1.Observation),
    __param(0, (0, type_graphql_1.Arg)("data")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [AddObservationInput]),
    __metadata("design:returntype", Promise)
], ObservationResolver.prototype, "addObservation", null);
ObservationResolver = __decorate([
    (0, type_graphql_1.Resolver)()
], ObservationResolver);
exports.default = ObservationResolver;
