use crate::{
  documents::{oas30::ToNode, GetReferencedLocations, GetSchemaLocations},
  utils::{NodeLocation, NodeRc},
};

#[derive(Clone)]
pub struct Body(NodeRc);

impl Body {
  pub fn schema_pointer(&self) -> Option<Vec<String>> {
    self
      .0
      .as_object()?
      .get("schema")
      .map(|_value| vec!["schema".to_owned()])
  }
}

impl From<NodeRc> for Body {
  fn from(value: NodeRc) -> Self {
    Self(value)
  }
}

impl GetSchemaLocations for Body {
  fn get_schema_locations(&self, location: &NodeLocation) -> Vec<NodeLocation> {
    self
      .schema_pointer()
      .into_iter()
      .map(|pointer| location.push_pointer(pointer))
      .collect()
  }
}

impl ToNode<Body> for Body {
  fn to_node(self) -> Option<Body> {
    Some(self)
  }
}
