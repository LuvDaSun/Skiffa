use super::nodes;
use crate::utils::NodeLocation;
use crate::{
  documents::{DocumentContext, DocumentError, DocumentInterface},
  models,
};
use std::collections::BTreeSet;
use std::{iter, rc};

pub struct Document {
  context: rc::Weak<DocumentContext>,
  retrieval_location: NodeLocation,
}

impl Document {
  pub fn new(context: rc::Weak<DocumentContext>, retrieval_location: NodeLocation) -> Self {
    Self {
      context,
      retrieval_location,
    }
  }
}

impl Document {
  fn get_referenced_locations_from_reference_entries<N>(
    location: NodeLocation,
    entries: impl Iterator<Item = (Vec<String>, nodes::NodeOrReference<N>)>,
  ) -> impl Iterator<Item = Result<NodeLocation, DocumentError>>
  where
    N: From<serde_json::Value>,
  {
    entries
      .filter_map(move |(pointer, node)| {
        let location = location.push_pointer(pointer);
        if let nodes::NodeOrReference::Reference(reference) = node {
          Some((location, reference))
        } else {
          None
        }
      })
      .map(|(location, reference)| {
        let reference_location: NodeLocation = reference.parse()?;
        Ok(location.join(&reference_location))
      })
  }

  fn get_sub_locations_from_node_entries<N, SR>(
    location: NodeLocation,
    entries: impl Iterator<Item = (Vec<String>, N)>,
    selector: impl Fn(NodeLocation, N) -> SR,
  ) -> impl Iterator<Item = Result<NodeLocation, DocumentError>>
  where
    N: From<serde_json::Value>,
    SR: Iterator<Item = Result<NodeLocation, DocumentError>>,
  {
    entries
      .map(move |(pointer, node)| {
        let location = location.push_pointer(pointer);
        (location, node)
      })
      .flat_map(move |(location, node)| (selector)(location, node))
  }

  fn get_node<T>(&self, location: &NodeLocation) -> Result<T, DocumentError>
  where
    T: From<serde_json::Value>,
  {
    let context = self.context.upgrade().unwrap();
    let node = context
      .get_node(location)
      .ok_or(DocumentError::NodeNotFound)?;
    let node: T = node.clone().into();
    Ok(node)
  }

  fn dereference<T>(
    &self,
    location: &NodeLocation,
    node: nodes::NodeOrReference<T>,
  ) -> Result<(NodeLocation, T), DocumentError>
  where
    T: From<serde_json::Value>,
  {
    match node {
      nodes::NodeOrReference::Reference(reference) => {
        let reference_location: NodeLocation = reference.parse()?;
        let context = self.context.upgrade().unwrap();
        let location = location.join(&reference_location);
        let node = context
          .get_node(&location)
          .ok_or(DocumentError::NodeNotFound)?
          .clone();
        let node = node.into();
        Ok((location, node))
      }
      nodes::NodeOrReference::Node(node) => Ok((location.clone(), node)),
    }
  }
}

impl DocumentInterface for Document {
  fn get_default_schema_id(&self) -> String {
    "https://spec.openapis.org/oas/3.0/schema/2021-09-28#/definitions/Schema".to_owned()
  }

  fn get_document_location(&self) -> NodeLocation {
    self.retrieval_location.clone()
  }

  fn get_api_model(&self) -> Result<rc::Rc<models::Api>, DocumentError> {
    let api_location = self.retrieval_location.clone();
    let api_node = self.get_node(&api_location)?;

    self.make_api_model(api_location, api_node).map(rc::Rc::new)
  }

  fn get_referenced_locations(&self) -> Result<Vec<NodeLocation>, DocumentError> {
    let api_location = self.retrieval_location.clone();
    let api_node = self.get_node(&api_location)?;

    self
      .get_referenced_locations_from_api(api_location, api_node)
      .collect()
  }

  fn get_schema_locations(&self) -> Result<Vec<NodeLocation>, DocumentError> {
    let api_location = self.retrieval_location.clone();
    let api_node = self.get_node(&api_location)?;

    self
      .get_schema_locations_from_api(api_location, api_node)
      .collect()
  }
}

impl Document {
  fn make_api_model(
    &self,
    api_location: NodeLocation,
    api_node: nodes::Api,
  ) -> Result<models::Api, DocumentError> {
    let paths = api_node
      .paths()
      .into_iter()
      .flatten()
      .enumerate()
      .map(|(index, (pointer, node))| {
        let pattern = pointer.last().unwrap().clone();
        let id = index + 1;
        let location = api_location.push_pointer(pointer);
        let (location, node) = self.dereference(&location, node)?;
        self
          .make_path_model(location, node, id, pattern)
          .map(rc::Rc::new)
      })
      .collect::<Result<_, DocumentError>>()?;

    let authentication = Vec::new(); // TODO

    Ok(models::Api {
      location: api_location.clone(),
      paths,
      authentication,
    })
  }

  fn make_path_model(
    &self,
    path_location: NodeLocation,
    path_node: nodes::Path,
    id: usize,
    pattern: String,
  ) -> Result<models::Path, DocumentError> {
    let operations = path_node
      .operations()
      .into_iter()
      .flatten()
      .map(|(pointer, node)| {
        let method = pointer.last().unwrap().as_str().try_into()?;
        let location = path_location.push_pointer(pointer);
        self
          .make_operation_model(
            path_location.clone(),
            path_node.clone(),
            location,
            node,
            method,
          )
          .map(rc::Rc::new)
      })
      .collect::<Result<_, DocumentError>>()?;

    Ok(models::Path {
      id,
      location: path_location.clone(),
      pattern,
      operations,
    })
  }

  fn make_operation_model(
    &self,
    path_location: NodeLocation,
    path_node: nodes::Path,
    operation_location: NodeLocation,
    operation_node: nodes::Operation,
    method: models::Method,
  ) -> Result<models::Operation, DocumentError> {
    let mut status_codes_available = BTreeSet::new();
    let authentication_requirements = Vec::new(); // TODO

    let all_parameter_nodes = iter::empty()
      .chain(
        path_node
          .request_parameters()
          .into_iter()
          .flatten()
          .map(|(pointer, node)| {
            let location = path_location.push_pointer(pointer);
            self.dereference(&location, node)
          }),
      )
      .chain(
        operation_node
          .request_parameters()
          .into_iter()
          .flatten()
          .map(|(pointer, node)| {
            let location = operation_location.push_pointer(pointer);
            self.dereference(&location, node)
          }),
      )
      .collect::<Result<Vec<_>, DocumentError>>()?;

    let cookie_parameters = all_parameter_nodes
      .iter()
      .filter_map(|(location, node)| {
        if node.r#in()? == "cookie" {
          Some(
            self
              .make_parameter_model_request(location.clone(), node.clone())
              .map(rc::Rc::new),
          )
        } else {
          None
        }
      })
      .collect::<Result<Vec<_>, DocumentError>>()?;

    let header_parameters = all_parameter_nodes
      .iter()
      .filter_map(|(location, node)| {
        if node.r#in()? == "header" {
          Some(
            self
              .make_parameter_model_request(location.clone(), node.clone())
              .map(rc::Rc::new),
          )
        } else {
          None
        }
      })
      .collect::<Result<Vec<_>, DocumentError>>()?;

    let path_parameters = all_parameter_nodes
      .iter()
      .filter_map(|(location, node)| {
        if node.r#in()? == "path" {
          Some(
            self
              .make_parameter_model_request(location.clone(), node.clone())
              .map(rc::Rc::new),
          )
        } else {
          None
        }
      })
      .collect::<Result<Vec<_>, DocumentError>>()?;

    let query_parameters = all_parameter_nodes
      .iter()
      .filter_map(|(location, node)| {
        if node.r#in()? == "query" {
          Some(
            self
              .make_parameter_model_request(location.clone(), node.clone())
              .map(rc::Rc::new),
          )
        } else {
          None
        }
      })
      .collect::<Result<Vec<_>, DocumentError>>()?;

    let bodies = operation_node
      .bodies()
      .into_iter()
      .flatten()
      .map(|(pointer, node)| {
        let content_type = pointer.last().unwrap().clone();
        let location = operation_location.push_pointer(pointer);
        self
          .make_body_model(location, node.clone(), content_type)
          .map(rc::Rc::new)
      })
      .collect::<Result<_, DocumentError>>()?;

    let mut operation_results = operation_node
      .operation_results()
      .into_iter()
      .flatten()
      .map(|(pointer, node)| {
        let status_kind = pointer.last().unwrap().clone();
        let location = path_location.push_pointer(pointer);
        let (location, node) = self.dereference(&location, node)?;
        self
          .make_operation_result_model(
            location,
            node.clone(),
            status_kind,
            &mut status_codes_available,
          )
          .map(rc::Rc::new)
      })
      .collect::<Result<Vec<_>, DocumentError>>()?;

    // TODO make status kind an enum and support it properly (default last)
    operation_results.sort_by_key(|operation_result| operation_result.status_kind.clone());

    Ok(models::Operation {
      location: operation_location.clone(),
      name: operation_node.name().map(Into::into).unwrap(),
      summary: operation_node.summary().map(Into::into),
      description: operation_node.description().map(Into::into),
      deprecated: operation_node.deprecated().unwrap_or(false),
      method,
      mockable: false, // TODO
      authentication_requirements,
      cookie_parameters,
      header_parameters,
      path_parameters,
      query_parameters,
      bodies,
      operation_results,
    })
  }

  fn make_operation_result_model(
    &self,
    operation_result_location: NodeLocation,
    operation_result_node: nodes::OperationResult,
    status_kind: String,
    _status_codes_available: &mut BTreeSet<usize>,
  ) -> Result<models::OperationResult, DocumentError> {
    let status_codes = Vec::new();

    // TODO populate status_codes

    let header_parameters = operation_result_node
      .response_headers()
      .into_iter()
      .flatten()
      .map(|(pointer, node)| {
        let name = pointer.last().unwrap().clone();
        let location = operation_result_location.push_pointer(pointer);
        let (location, node) = self.dereference(&location, node)?;
        self
          .make_parameter_model_response(location, node, name)
          .map(rc::Rc::new)
      })
      .collect::<Result<_, DocumentError>>()?;

    let bodies = operation_result_node
      .bodies()
      .into_iter()
      .flatten()
      .map(|(pointer, node)| {
        let content_type = pointer.last().unwrap().clone();
        let location = operation_result_location.push_pointer(pointer);
        self
          .make_body_model(location, node.clone(), content_type)
          .map(rc::Rc::new)
      })
      .collect::<Result<_, DocumentError>>()?;

    Ok(models::OperationResult {
      location: operation_result_location.clone(),
      description: operation_result_node.description().map(Into::into),
      status_kind,
      status_codes,
      mockable: false,
      header_parameters,
      bodies,
    })
  }

  fn make_body_model(
    &self,
    body_location: NodeLocation,
    body_node: nodes::Body,
    content_type: String,
  ) -> Result<models::Body, DocumentError> {
    let schema_id = body_node
      .schema_pointer()
      .map(|pointer| body_location.push_pointer(pointer));

    Ok(models::Body {
      location: body_location.clone(),
      content_type,
      mockable: false,
      schema_id,
    })
  }

  fn make_parameter_model_request(
    &self,
    parameter_location: NodeLocation,
    parameter_node: nodes::RequestParameter,
  ) -> Result<models::Parameter, DocumentError> {
    let schema_id = parameter_node
      .schema_pointer()
      .map(|pointer| parameter_location.push_pointer(pointer));

    Ok(models::Parameter {
      location: parameter_location.clone(),
      name: parameter_node.name().map(Into::into).unwrap(),
      required: parameter_node.required().unwrap_or(false),
      mockable: false,
      schema_id,
    })
  }

  fn make_parameter_model_response(
    &self,
    header_location: NodeLocation,
    header_node: nodes::ResponseHeader,
    name: String,
  ) -> Result<models::Parameter, DocumentError> {
    let schema_id = header_node
      .schema_pointer()
      .map(|pointer| header_location.push_pointer(pointer));

    Ok(models::Parameter {
      location: header_location.clone(),
      name,
      required: header_node.required().unwrap_or(false),
      mockable: false,
      schema_id,
    })
  }
}

impl Document {
  fn get_referenced_locations_from_api(
    &self,
    location: NodeLocation,
    node: nodes::Api,
  ) -> impl Iterator<Item = Result<NodeLocation, DocumentError>> + '_ {
    iter::empty()
      .chain(Self::get_referenced_locations_from_reference_entries(
        location.clone(),
        node.paths().into_iter().flatten(),
      ))
      .chain(Self::get_sub_locations_from_node_entries(
        location.clone(),
        node
          .paths()
          .into_iter()
          .flatten()
          .filter_map(|(pointer, node)| node.into_node().map(|node| (pointer, node))),
        |location, node| self.get_referenced_locations_from_path(location, node),
      ))
  }

  fn get_referenced_locations_from_path(
    &self,
    location: NodeLocation,
    node: nodes::Path,
  ) -> impl Iterator<Item = Result<NodeLocation, DocumentError>> + '_ {
    iter::empty()
      .chain(Self::get_sub_locations_from_node_entries(
        location.clone(),
        node.operations().into_iter().flatten(),
        |location, node| self.get_referenced_locations_from_operation(location, node),
      ))
      .chain(Self::get_referenced_locations_from_reference_entries(
        location.clone(),
        node.request_parameters().into_iter().flatten(),
      ))
  }

  fn get_referenced_locations_from_operation(
    &self,
    location: NodeLocation,
    node: nodes::Operation,
  ) -> impl Iterator<Item = Result<NodeLocation, DocumentError>> + '_ {
    iter::empty()
      .chain(Self::get_referenced_locations_from_reference_entries(
        location.clone(),
        node.operation_results().into_iter().flatten(),
      ))
      .chain(Self::get_sub_locations_from_node_entries(
        location.clone(),
        node
          .operation_results()
          .into_iter()
          .flatten()
          .filter_map(|(pointer, node)| node.into_node().map(|node| (pointer, node))),
        |location, node| self.get_referenced_locations_from_operation_result(location, node),
      ))
      .chain(Self::get_referenced_locations_from_reference_entries(
        location.clone(),
        node.request_parameters().into_iter().flatten(),
      ))
  }

  fn get_referenced_locations_from_operation_result(
    &self,
    location: NodeLocation,
    node: nodes::OperationResult,
  ) -> impl Iterator<Item = Result<NodeLocation, DocumentError>> {
    Self::get_referenced_locations_from_reference_entries(
      location,
      node.response_headers().into_iter().flatten(),
    )
  }
}

impl Document {
  fn get_schema_locations_from_api(
    &self,
    location: NodeLocation,
    node: nodes::Api,
  ) -> impl Iterator<Item = Result<NodeLocation, DocumentError>> + '_ {
    Self::get_sub_locations_from_node_entries(
      location.clone(),
      node
        .paths()
        .into_iter()
        .flatten()
        .filter_map(|(pointer, node)| node.into_node().map(|node| (pointer, node))),
      |location, node| self.get_schema_locations_from_path(location, node),
    )
  }

  fn get_schema_locations_from_path(
    &self,
    location: NodeLocation,
    node: nodes::Path,
  ) -> impl Iterator<Item = Result<NodeLocation, DocumentError>> + '_ {
    iter::empty()
      .chain(Self::get_sub_locations_from_node_entries(
        location.clone(),
        node
          .request_parameters()
          .into_iter()
          .flatten()
          .filter_map(|(pointer, node)| node.into_node().map(|node| (pointer, node))),
        |location, node| self.get_schema_locations_from_request_parameter(location, node),
      ))
      .chain(Self::get_sub_locations_from_node_entries(
        location.clone(),
        node.operations().into_iter().flatten(),
        |location, node| self.get_schema_locations_from_operation(location, node),
      ))
  }

  fn get_schema_locations_from_operation(
    &self,
    location: NodeLocation,
    node: nodes::Operation,
  ) -> impl Iterator<Item = Result<NodeLocation, DocumentError>> + '_ {
    iter::empty()
      .chain(Self::get_sub_locations_from_node_entries(
        location.clone(),
        node
          .request_parameters()
          .into_iter()
          .flatten()
          .filter_map(|(pointer, node)| node.into_node().map(|node| (pointer, node))),
        |location, node| self.get_schema_locations_from_request_parameter(location, node),
      ))
      .chain(Self::get_sub_locations_from_node_entries(
        location.clone(),
        node
          .operation_results()
          .into_iter()
          .flatten()
          .filter_map(|(pointer, node)| node.into_node().map(|node| (pointer, node))),
        |location, node| {
          self
            .get_schema_locations_from_operation_result(location, node)
            .collect::<Vec<_>>()
            .into_iter()
        },
      ))
  }

  fn get_schema_locations_from_operation_result(
    &self,
    location: NodeLocation,
    node: nodes::OperationResult,
  ) -> impl Iterator<Item = Result<NodeLocation, DocumentError>> + '_ {
    iter::empty()
      .chain(Self::get_sub_locations_from_node_entries(
        location.clone(),
        node
          .response_headers()
          .into_iter()
          .flatten()
          .filter_map(|(pointer, node)| node.into_node().map(|node| (pointer, node))),
        |location, node| {
          self
            .get_schema_locations_from_response_header(location, node)
            .collect::<Vec<_>>()
            .into_iter()
        },
      ))
      .chain(Self::get_sub_locations_from_node_entries(
        location.clone(),
        node.bodies().into_iter().flatten(),
        |location, node| {
          self
            .get_schema_locations_from_body(location, node)
            .collect::<Vec<_>>()
            .into_iter()
        },
      ))
  }

  fn get_schema_locations_from_request_parameter(
    &self,
    location: NodeLocation,
    node: nodes::RequestParameter,
  ) -> impl Iterator<Item = Result<NodeLocation, DocumentError>> {
    node
      .schema_pointer()
      .into_iter()
      .map(move |pointer| location.push_pointer(pointer))
      .map(Ok)
  }

  fn get_schema_locations_from_response_header(
    &self,
    location: NodeLocation,
    node: nodes::ResponseHeader,
  ) -> impl Iterator<Item = Result<NodeLocation, DocumentError>> {
    node
      .schema_pointer()
      .into_iter()
      .map(move |pointer| location.push_pointer(pointer))
      .map(Ok)
  }

  fn get_schema_locations_from_body(
    &self,
    location: NodeLocation,
    node: nodes::Body,
  ) -> impl Iterator<Item = Result<NodeLocation, DocumentError>> {
    node
      .schema_pointer()
      .into_iter()
      .map(move |pointer| location.push_pointer(pointer))
      .map(Ok)
  }
}
