import * as core from "@oa42/core";
import { toPascal } from "../../utils/index.js";

export function getServerAuthenticationTypeName() {
  return toPascal("server", "authentication");
}

export function getAuthenticationHandlerTypeName(
  authenticationModel: core.AuthenticationContainer,
) {
  return toPascal(authenticationModel.name, "authentication", "handler");
}

export function getOperationHandlerTypeName(operationModel: core.OperationContainer) {
  return toPascal(operationModel.name, "operation", "handler");
}

export function getOperationHandlersTypeName() {
  return toPascal("operation", "handlers");
}

export function getOperationAuthenticationTypeName(operationModel: core.OperationContainer) {
  return toPascal(operationModel.name, "authentication");
}

export function getAuthenticationHandlersTypeName() {
  return toPascal("authentication", "handlers");
}

export function getOperationAcceptTypeName(operationModel: core.OperationContainer) {
  return toPascal(operationModel.name, "operation", "accept");
}

export function getCredentialsTypeName() {
  return toPascal("credentials");
}

export function getOperationCredentialsTypeName(operationModel: core.OperationContainer) {
  return toPascal(operationModel.name, "credentials");
}

export function getAuthenticationCredentialTypeName(
  authenticationModel: core.AuthenticationContainer,
) {
  return toPascal(authenticationModel.name, "credential");
}

export function getIncomingRequestTypeName(operationModel: core.OperationContainer) {
  return toPascal(operationModel.name, "incoming", "request");
}

export function getIncomingResponseTypeName(operationModel: core.OperationContainer) {
  return toPascal(operationModel.name, "incoming", "response");
}

export function getOutgoingRequestTypeName(operationModel: core.OperationContainer) {
  return toPascal(operationModel.name, "outgoing", "request");
}

export function getOutgoingResponseTypeName(operationModel: core.OperationContainer) {
  return toPascal(operationModel.name, "outgoing", "response");
}

export function getRequestParametersTypeName(operationModel: core.OperationContainer) {
  return toPascal(operationModel.name, "request", "parameters");
}

export function getResponseParametersTypeName(
  operationModel: core.OperationContainer,
  operationResultModel: core.OperationResultContainer,
) {
  return toPascal(operationModel.name, operationResultModel.statusKind, "response", "parameters");
}
