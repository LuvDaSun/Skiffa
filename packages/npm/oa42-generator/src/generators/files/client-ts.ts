import { banner } from "@oa42/core";
import { RouterMode } from "goodrouter";
import * as models from "../../models/index.js";
import { packageInfo, toCamel, toPascal } from "../../utils/index.js";
import { itt } from "../../utils/iterable-text-template.js";
import { generateClientOperationFunctionBody } from "../functions/index.js";
import {
  generateOperationCredentialsType,
  generateOperationIncomingResponseType,
  generateOperationOutgoingRequestType,
} from "../types/index.js";

export function* generateClientTsCode(apiModel: models.Api) {
  yield banner("//", `v${packageInfo.version}`);

  yield itt`
    import { Router } from "goodrouter";
    import * as parameters from "./parameters.js";
    import * as types from "./types.js";
    import * as validators from "./validators.js";
    import * as parsers from "./parsers.js";
    import * as shared from "./shared.js";
    import * as lib from "oa42-lib";
  `;

  yield itt`
    export interface ClientConfiguration {
      baseUrl?: URL;
      validateIncomingEntity?: boolean;
      validateIncomingParameters?: boolean;
      validateOutgoingEntity?: boolean;
      validateOutgoingParameters?: boolean;
    }

    export const defaultClientConfiguration = {
      validateIncomingEntity: true,
      validateIncomingParameters: true,
      validateOutgoingEntity: false,
      validateOutgoingParameters: false,
    };
  `;

  yield itt`
    const router = new Router({
      parameterValueDecoder: value => value,
      parameterValueEncoder: value => value,
    }).loadFromJson(${JSON.stringify(apiModel.router.saveToJson(RouterMode.Client))});
  `;

  for (const pathModel of apiModel.paths) {
    for (const operationModel of pathModel.operations) {
      const operationFunctionName = toCamel(operationModel.name);
      const operationOutgoingRequestName = toPascal(operationModel.name, "outgoing", "request");
      const operationIncomingResponseName = toPascal(operationModel.name, "incoming", "response");
      const credentialsName = toPascal(operationModel.name, "credentials");

      const jsDoc = [
        operationModel.deprecated ? "@deprecated" : "",
        operationModel.summary,
        operationModel.description,
      ]
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .join("\n");

      yield itt`
        /**
          ${jsDoc}
         */
        export async function ${operationFunctionName}(
          outgoingRequest: ${operationOutgoingRequestName},
          credentials: ${credentialsName},
          configuration: ClientConfiguration = defaultClientConfiguration,
        ): Promise<${operationIncomingResponseName}> {
          ${generateClientOperationFunctionBody(apiModel, pathModel, operationModel)}
        }
      `;
      yield* generateOperationCredentialsType(apiModel, operationModel);
      yield* generateOperationOutgoingRequestType(apiModel, operationModel);
      yield* generateOperationIncomingResponseType(apiModel, operationModel);
    }
  }
}
