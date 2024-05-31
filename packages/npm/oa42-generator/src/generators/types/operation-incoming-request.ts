import * as core from "@oa42/core";
import * as models from "../../models/index.js";
import { joinIterable, mapIterable } from "../../utils/index.js";
import { itt } from "../../utils/iterable-text-template.js";
import { getIncomingRequestTypeName, getRequestParametersTypeName } from "../names/index.js";

export function* generateOperationIncomingRequestType(
  apiModelLegacy: models.Api,
  operationModel: core.OperationContainer,
) {
  const typeName = getIncomingRequestTypeName(operationModel);

  yield itt`
    export type ${typeName} = ${joinIterable(
      mapIterable(generateElements(apiModelLegacy, operationModel), (element) => itt`(${element})`),
      " |\n",
    )};
  `;
}

function* generateElements(apiModelLegacy: models.Api, operationModel: core.OperationContainer) {
  yield itt`
    ${generateParametersContainerType(operationModel)} &
    (
      ${joinIterable(generateBodyContainerTypes(apiModelLegacy, operationModel), " |\n")}
    )
  `;
}

function* generateParametersContainerType(operationModel: core.OperationContainer) {
  const parametersTypeName = getRequestParametersTypeName(operationModel);

  yield `lib.ParametersContainer<parameters.${parametersTypeName}>`;
}

function* generateBodyContainerTypes(
  apiModelLegacy: models.Api,
  operationModel: core.OperationContainer,
) {
  if (operationModel.bodies.length === 0) {
    yield* generateBodyContainerType(apiModelLegacy, operationModel);
  }

  for (const bodyModel of operationModel.bodies) {
    yield* generateBodyContainerType(apiModelLegacy, operationModel, bodyModel);
  }
}

function* generateBodyContainerType(
  apiModelLegacy: models.Api,
  operationModel: core.OperationContainer,
  bodyModel?: core.BodyContainer,
) {
  if (bodyModel == null) {
    yield itt`
      lib.IncomingEmptyRequest
    `;
    return;
  }

  switch (bodyModel.contentType) {
    case "text/plain": {
      yield itt`
        lib.IncomingTextRequest<
          ${JSON.stringify(bodyModel.contentType)}
        >
      `;
      break;
    }
    case "application/json": {
      const bodySchemaId = bodyModel.schemaId?.toString();
      const bodyTypeName = bodySchemaId == null ? bodySchemaId : apiModelLegacy.names[bodySchemaId];

      yield itt`
        lib.IncomingJsonRequest<
          ${JSON.stringify(bodyModel.contentType)},
          ${bodyTypeName == null ? "unknown" : itt`types.${bodyTypeName}`}
        >
      `;
      break;
    }
    default: {
      yield itt`
        lib.IncomingStreamRequest<
          ${JSON.stringify(bodyModel.contentType)}
        >
      `;
      break;
    }
  }
}
