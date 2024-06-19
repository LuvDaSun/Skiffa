import * as oa42Core from "@oa42/core";
import { itt } from "../../utils/iterable-text-template.js";
import {
  getAuthenticationHandlerName,
  getAuthenticationHandlerTypeName,
  getAuthenticationHandlersTypeName,
  getAuthenticationMemberName,
  getServerAuthenticationTypeName,
} from "../names/index.js";

export function* generateAuthenticationHandlerType(
  authenticationModel: oa42Core.AuthenticationContainer,
) {
  const serverAuthenticationName = getServerAuthenticationTypeName();
  const handlerTypeName = getAuthenticationHandlerTypeName(authenticationModel);

  switch (authenticationModel.type) {
    case "apiKey":
      yield itt`
        export type ${handlerTypeName}<A extends ${serverAuthenticationName}> =
          (credential: string) =>
            Promise<A[${JSON.stringify(getAuthenticationMemberName(authenticationModel))}] | undefined>;
        `;
      break;

    case "http":
      switch (authenticationModel.scheme) {
        case "basic":
          yield itt`
            export type ${handlerTypeName}<A extends ${serverAuthenticationName}> =
              (credential: {
                id: string,
                secret: string,
              }) =>
                Promise<A[${JSON.stringify(getAuthenticationMemberName(authenticationModel))}] | undefined>;
            `;
          break;

        case "bearer":
          yield itt`
            export type ${handlerTypeName}<A extends ${serverAuthenticationName}> =
              (credential: string) =>
                Promise<A[${JSON.stringify(getAuthenticationMemberName(authenticationModel))}] | undefined>;
            `;
          break;

        default: {
          throw "impossible";
        }
      }
      break;

    default: {
      throw "impossible";
    }
  }
}

export function* generateAuthenticationHandlersType(apiModel: oa42Core.ApiContainer) {
  const serverAuthenticationName = getServerAuthenticationTypeName();
  const typeName = getAuthenticationHandlersTypeName();

  yield itt`
    export type ${typeName}<A extends ${serverAuthenticationName}> = {
      ${body()}
    } 
  `;

  function* body() {
    for (const authenticationModel of apiModel.authentication) {
      const typeName = getAuthenticationHandlerTypeName(authenticationModel);
      const propertyName = getAuthenticationHandlerName(authenticationModel);
      yield `
        ${propertyName}: ${typeName}<A>,
      `;
    }
  }
}
