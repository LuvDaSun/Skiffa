use super::DocumentError;
use crate::{models, utils::NodeLocation};

pub trait DocumentInterface {
  fn get_referenced_locations(&self) -> Result<Vec<NodeLocation>, DocumentError>;
  fn get_api_model(&self) -> Result<models::ApiContainer, DocumentError>;
}

pub struct DocumentConfiguration {
  pub retrieval_location: NodeLocation,
}

pub type DocumentFactory = Box<dyn Fn(DocumentConfiguration) -> Box<dyn DocumentInterface>>;

pub trait ReferencedLocations {
  fn get_referenced_locations(&self) -> Result<Vec<NodeLocation>, DocumentError>;
}

pub trait SchemaLocations {
  fn get_schema_locations(&self) -> Vec<NodeLocation>;
}
