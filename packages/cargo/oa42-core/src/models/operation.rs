use super::{
  AuthenticationRequirementGroupContainer, BodyContainer, Method, OperationResultContainer,
  ParameterContainer,
};
use jns42_core::utils::NodeLocation;

#[oa42_macros::model_container]
pub struct Operation {
  pub location: NodeLocation,
  pub method: Method,
  pub name: String,
  pub summary: Option<String>,
  pub description: Option<String>,
  pub deprecated: bool,
  pub mockable: bool,
  /**
   * all authentications from the second level should pass, any authentications
   * of the first level should pass
   */
  pub authentication_requirements: Vec<AuthenticationRequirementGroupContainer>,
  pub query_parameters: Vec<ParameterContainer>,
  pub header_parameters: Vec<ParameterContainer>,
  pub path_parameters: Vec<ParameterContainer>,
  pub cookie_parameters: Vec<ParameterContainer>,
  pub bodies: Vec<BodyContainer>,
  pub operation_results: Vec<OperationResultContainer>,
}
