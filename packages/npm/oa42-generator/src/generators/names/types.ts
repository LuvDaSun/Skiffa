import * as skiffaCore from "@skiffa/core";
import { toPascal } from "../../utils/index.js";

export function getServerAuthenticationTypeName() {
  return toPascal("server", "authentication");
}

export function getAuthenticationHandlerTypeName(
  authenticationModel: skiffaCore.AuthenticationContainer,
) {
  return toPascal(authenticationModel.name, "authentication", "handler");
}

export function getOperationHandlerTypeName(operationModel: skiffaCore.OperationContainer) {
  return toPascal(operationModel.name, "operation", "handler");
}

export function getOperationHandlersTypeName() {
  return toPascal("operation", "handlers");
}

export function getOperationAuthenticationTypeName(operationModel: skiffaCore.OperationContainer) {
  return toPascal(operationModel.name, "authentication");
}

export function getAuthenticationHandlersTypeName() {
  return toPascal("authentication", "handlers");
}

export function getOperationAcceptTypeName(operationModel: skiffaCore.OperationContainer) {
  return toPascal(operationModel.name, "operation", "accept");
}

export function getCredentialsTypeName() {
  return toPascal("credentials");
}

export function getOperationCredentialsTypeName(operationModel: skiffaCore.OperationContainer) {
  return toPascal(operationModel.name, "credentials");
}

export function getAuthenticationCredentialTypeName(
  authenticationModel: skiffaCore.AuthenticationContainer,
) {
  return toPascal(authenticationModel.name, "credential");
}

export function getIncomingRequestTypeName(operationModel: skiffaCore.OperationContainer) {
  return toPascal(operationModel.name, "incoming", "request");
}

export function getIncomingResponseTypeName(operationModel: skiffaCore.OperationContainer) {
  return toPascal(operationModel.name, "incoming", "response");
}

export function getOutgoingRequestTypeName(operationModel: skiffaCore.OperationContainer) {
  return toPascal(operationModel.name, "outgoing", "request");
}

export function getOutgoingResponseTypeName(operationModel: skiffaCore.OperationContainer) {
  return toPascal(operationModel.name, "outgoing", "response");
}

export function getRequestParametersTypeName(operationModel: skiffaCore.OperationContainer) {
  return toPascal(operationModel.name, "request", "parameters");
}

export function getResponseParametersTypeName(
  operationModel: skiffaCore.OperationContainer,
  operationResultModel: skiffaCore.OperationResultContainer,
) {
  return toPascal(operationModel.name, operationResultModel.statusKind, "response", "parameters");
}
