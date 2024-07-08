import * as skiffaCore from "@skiffa/core";
import { itt } from "../../utils/index.js";
import {
  getOperationCredentialsTypeName,
  getOperationFunctionName,
  getRequestParametersTypeName,
} from "../names/index.js";

export function* generateFacadeOperationFunction(
  names: Record<string, string>,
  apiModel: skiffaCore.ApiContainer,
  pathModel: skiffaCore.PathContainer,
  operationModel: skiffaCore.OperationContainer,
) {
  const operationFunctionName = getOperationFunctionName(operationModel);
  const credentialsName = getOperationCredentialsTypeName(operationModel);

  const jsDoc = [
    operationModel.deprecated ? "@deprecated" : "",
    operationModel.summary ?? "",
    operationModel.description ?? "",
  ]
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n");

  const hasParameters =
    operationModel.pathParameters.length > 0 &&
    operationModel.queryParameters.length > 0 &&
    operationModel.headerParameters.length > 0 &&
    operationModel.cookieParameters.length > 0;

  const hasEntity = true;
  const parametersTypeName = getRequestParametersTypeName(operationModel);

  yield itt`
  /**
    ${jsDoc}
   */
  export async function ${operationFunctionName}(
    ${hasParameters ? `requestParameters: parameters.${parametersTypeName},` : ""}
    ${hasEntity ? `entity: unknown,` : ""}
    operationCredentials: client.${credentialsName} = {},
    operationConfiguration: client.ClientConfiguration = {},
  ): Promise<unknown> {
    ${generateBody(names, apiModel, pathModel, operationModel)}
  }
`;
}

function* generateBody(
  names: Record<string, string>,
  apiModel: skiffaCore.ApiContainer,
  pathModel: skiffaCore.PathContainer,
  operationModel: skiffaCore.OperationContainer,
) {
  const operationFunctionName = getOperationFunctionName(operationModel);

  const hasParameters =
    operationModel.pathParameters.length > 0 &&
    operationModel.queryParameters.length > 0 &&
    operationModel.headerParameters.length > 0 &&
    operationModel.cookieParameters.length > 0;

  const hasEntity = true;

  yield itt`
    const result = await client.${operationFunctionName}({
      parameters: ${hasParameters ? "requestParameters" : "{}"},
      contentType: "application/json",
      entity: () => entity,
    });

    if (result.status < 200 || result.status >= 300) {
      throw new lib.UnexpectedStatusCode(result.status)  
    }

    const resultEntity = await result.entity();
    return resultEntity;
  `;
}
