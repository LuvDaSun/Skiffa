import * as skiffaCore from "@skiffa/core";
import { Router, RouterMode } from "goodrouter";
import { packageInfo } from "../../utils.js";
import { itt } from "../../utils/iterable-text-template.js";

export function* generateRouterTsCode(router: Router<number>) {
  yield skiffaCore.banner("//", `v${packageInfo.version}`);

  yield itt`
    import { Router } from "goodrouter";
  `;

  yield itt`
    export const router = new Router({
      parameterValueDecoder: value => value,
      parameterValueEncoder: value => value,
    }).loadFromJson(${JSON.stringify(router.saveToJson(RouterMode.Bidirectional))});
  `;
}