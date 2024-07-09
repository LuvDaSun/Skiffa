import * as skiffaCore from "@skiffa/core";
import { itt } from "../../utils/index.js";
import { selectBodies } from "../helpers.js";
import {
  getOperationCredentialsTypeName,
  getOperationFunctionName,
  getOutgoingRequestTypeName,
  getRequestParametersTypeName,
} from "../names/index.js";

/**
 * Generates code for the facade (aka simple client). These functions call the advanced client.
 * These functions make it a bit easier to work with the API.
 *
 * The first argument of the function is the request parameters. These may be omitted if there
 * are no request parameters.
 *
 * The second argument is the request content type. If there is only one request content type,
 * this is omitted.
 *
 * The third argument is the request body. In case of json this is the entity, in case of text
 * this is the text value.
 *
 * And then there is an optional argument for credentials and configuration. These can also be
 * set globally and probably never have to be passed to the function.
 */

export function* generateFacadeOperationFunction(
  names: Record<string, string>,
  apiModel: skiffaCore.ApiContainer,
  pathModel: skiffaCore.PathContainer,
  operationModel: skiffaCore.OperationContainer,
  requestTypes: Array<string>,
  responseTypes: Array<string>,
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

  const requestBodyModels = selectBodies(operationModel, requestTypes);

  const hasParametersArgument =
    operationModel.pathParameters.length > 0 ||
    operationModel.queryParameters.length > 0 ||
    operationModel.headerParameters.length > 0 ||
    operationModel.cookieParameters.length > 0;
  const hasContentTypeArgument = requestBodyModels.length > 1;
  const hasEntityArgument = requestBodyModels.length > 0;

  const parametersTypeName = getRequestParametersTypeName(operationModel);

  for (const requestBodyModel of requestBodyModels) {
    const requestEntityTypeName =
      requestBodyModel.schemaId == null ? null : names[requestBodyModel.schemaId];
    yield itt`
      /**
        ${jsDoc}
      */
      export function ${operationFunctionName}(
        ${hasParametersArgument ? `parameters: parameters.${parametersTypeName},` : ""}
        ${hasContentTypeArgument ? `contentType: ${JSON.stringify(requestBodyModel.contentType)},` : ""}
        ${hasEntityArgument ? `entity: ${requestEntityTypeName == null ? "unknown" : `types.${requestEntityTypeName}`},` : ""}
        operationCredentials?: client.${credentialsName},
        operationConfiguration?: client.ClientConfiguration,
      ): Promise<${generateOperationReturnType(names, operationModel, responseTypes)}>;
    `;
  }

  yield itt`
    /**
      ${jsDoc}
    */
    export async function ${operationFunctionName}(
      ${hasParametersArgument ? `parameters: parameters.${parametersTypeName},` : ""}
      ${hasContentTypeArgument ? `contentType: string,` : ""}
      ${hasEntityArgument ? `entity: unknown,` : ""}
      operationCredentials: client.${credentialsName} = {},
      operationConfiguration: client.ClientConfiguration = {},
    ): Promise<${generateOperationReturnType(names, operationModel, responseTypes)}> {
      ${generateBody(names, apiModel, pathModel, operationModel, requestTypes, responseTypes)}
    }
  `;
}

function* generateOperationReturnType(
  names: Record<string, string>,
  operationModel: skiffaCore.OperationContainer,
  responseTypes: Array<string>,
) {
  const operationResultModels = operationModel.operationResults.filter((operationResultModel) =>
    operationResultModel.statusCodes.some((statusCode) => statusCode >= 200 && statusCode < 300),
  );

  switch (operationResultModels.length) {
    case 0: {
      // no operation result
      yield "never";
      break;
    }
    case 1: {
      // default operation result
      const [operationResultModel] = operationResultModels;
      yield generateOperationResultReturnType(
        names,
        operationModel,
        operationResultModel,
        responseTypes,
        0,
      );
      break;
    }
    default: {
      // multiple operation results
      let index = 0;
      for (const operationResultModel of operationResultModels) {
        if (index > 0) {
          yield " | ";
        }
        yield generateOperationResultReturnType(
          names,
          operationModel,
          operationResultModel,
          responseTypes,
          1,
        );
        index++;
      }
      break;
    }
  }
}

function* generateOperationResultReturnType(
  names: Record<string, string>,
  operationModel: skiffaCore.OperationContainer,
  operationResultModel: skiffaCore.OperationResultContainer,
  responseTypes: Array<string>,
  level: number,
) {
  const responseBodyModels = selectBodies(operationResultModel, responseTypes);

  switch (responseBodyModels.length) {
    case 0: {
      //  no response body
      yield generateResponseBodyReturnType(names, operationResultModel, null, level);
      break;
    }
    case 1: {
      // default response body
      const [responseBodyModel] = responseBodyModels;
      yield generateResponseBodyReturnType(names, operationResultModel, responseBodyModel, level);
      break;
    }
    default: {
      // multiple response bodies
      let index = 0;
      for (const responseBodyModel of responseBodyModels) {
        if (index > 0) {
          yield " | ";
        }
        yield generateResponseBodyReturnType(
          names,
          operationResultModel,
          responseBodyModel,
          level + 1,
        );
        index++;
      }
      break;
    }
  }
}

function* generateResponseBodyReturnType(
  names: Record<string, string>,
  operationResultModel: skiffaCore.OperationResultContainer,
  responseBodyModel: skiffaCore.BodyContainer | null,
  level: number,
) {
  const responseEntityTypeName =
    responseBodyModel?.schemaId == null ? null : names[responseBodyModel.schemaId];

  switch (level) {
    case 0:
      yield `
        ${responseBodyModel == null ? "undefined" : responseEntityTypeName == null ? "unknown" : `types.${responseEntityTypeName}`},
      `;
      break;

    case 1:
      yield `[
        ${JSON.stringify(responseBodyModel?.contentType ?? null)},
        ${responseBodyModel == null ? "undefined" : responseEntityTypeName == null ? "unknown" : `types.${responseEntityTypeName}`},
      ]`;
      break;

    case 2:
      yield `[
        ${[...operationResultModel.statusCodes]
          .filter((statusCode) => statusCode >= 200 && statusCode < 300)
          .map((value) => JSON.stringify(value))
          .join(" | ")},
        ${JSON.stringify(responseBodyModel?.contentType ?? null)},
        ${responseBodyModel == null ? "undefined" : responseEntityTypeName == null ? "unknown" : `types.${responseEntityTypeName}`},
      ]`;
      break;
  }
}

function* generateBody(
  names: Record<string, string>,
  apiModel: skiffaCore.ApiContainer,
  pathModel: skiffaCore.PathContainer,
  operationModel: skiffaCore.OperationContainer,
  requestTypes: Array<string>,
  responseTypes: Array<string>,
) {
  const operationFunctionName = getOperationFunctionName(operationModel);

  const requestBodyModels = selectBodies(operationModel, requestTypes);

  const hasParametersArgument =
    operationModel.pathParameters.length > 0 ||
    operationModel.queryParameters.length > 0 ||
    operationModel.headerParameters.length > 0 ||
    operationModel.cookieParameters.length > 0;
  const hasContentTypeArgument = requestBodyModels.length > 1;
  const hasEntityArgument = requestBodyModels.length > 0;

  const defaultRequestBodyModel = requestBodyModels.length === 1 ? requestBodyModels[0] : null;

  const operationOutgoingRequestName = getOutgoingRequestTypeName(operationModel);

  yield itt`
    const result = await client.${operationFunctionName}(
      {
        ${hasParametersArgument ? "parameters" : "parameters: {}"},
        ${hasContentTypeArgument ? "contentType" : `contentType: ${JSON.stringify(defaultRequestBodyModel?.contentType ?? null)}`},
        ${hasEntityArgument ? "entity: () => entity," : ""}
      } as client.${operationOutgoingRequestName},
      operationCredentials,
      operationConfiguration,
    );
  `;

  yield itt`
    switch(result.status) {
      ${generateStatusCodesCaseClauses(operationModel, responseTypes)}
    }
  `;
}

function* generateStatusCodesCaseClauses(
  operationModel: skiffaCore.OperationContainer,
  responseTypes: Array<string>,
) {
  for (const operationResultModel of operationModel.operationResults) {
    {
      const statusCodes = [...operationResultModel.statusCodes].filter(
        (statusCode) => statusCode >= 200 && statusCode < 300,
      );
      let statusCode;
      while ((statusCode = statusCodes.shift()) != null) {
        yield itt`case ${JSON.stringify(statusCode)}:`;
        // it's te last one!
        if (statusCodes.length === 0) {
          yield itt`
          {
            ${generateStatusCodeCaseBody(operationResultModel, responseTypes)}
            break;
          }
        `;
        }
      }
    }
    {
      const statusCodes = [...operationResultModel.statusCodes].filter(
        (statusCode) => !(statusCode >= 200 && statusCode < 300),
      );
      let statusCode;
      while ((statusCode = statusCodes.shift()) != null) {
        yield itt`case ${JSON.stringify(statusCode)}:`;
        // it's te last one!
        if (statusCodes.length === 0) {
          yield itt`
            throw new lib.UnexpectedStatusCode(result.status);
          `;
        }
      }
    }
  }

  yield itt`
    default:
      throw "cannot happen"
  `;
}

function* generateStatusCodeCaseBody(
  operationResultModel: skiffaCore.OperationResultContainer,
  responseTypes: Array<string>,
) {
  const responseBodyModels = selectBodies(operationResultModel, responseTypes);
  yield itt`
    switch(result.contentType) {
      ${generateContentTypesCaseClauses(operationResultModel, responseBodyModels)}
    }
  `;
}

function* generateContentTypesCaseClauses(
  operationResultModel: skiffaCore.OperationResultContainer,
  responseBodyModels: Array<skiffaCore.BodyContainer>,
) {
  for (const bodyModel of responseBodyModels) {
    yield itt`case ${JSON.stringify(bodyModel.contentType)}:`;
    yield itt`
        {
          return (${generateContentEntityExpression(bodyModel)});
        }
      `;
  }

  yield itt`
    default:
      throw "cannot happen";
    `;
}

function* generateContentEntityExpression(responseBodyModel: skiffaCore.BodyContainer) {
  switch (responseBodyModel.contentType) {
    case "application/json":
      yield itt`
        result.entity()
      `;
      break;

    case "text/plain":
      yield itt`
        result.value()
      `;
      break;

    default:
      yield itt`
        result.stream()
      `;
  }
}
