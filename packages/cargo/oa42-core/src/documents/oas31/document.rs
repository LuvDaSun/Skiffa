use crate::{
  documents::{self, DocumentContext, DocumentInterface},
  models,
  utils::{NodeLocation, NodeRc},
};
use std::rc::Weak;

pub struct Document {
  retrieval_location: NodeLocation,
  node: NodeRc,
}

impl Document {
  pub fn new(context: Weak<DocumentContext>, retrieval_location: NodeLocation) -> Self {
    let context = context.upgrade().unwrap();
    let node = context.get_node(&retrieval_location).unwrap();
    Self {
      retrieval_location,
      node,
    }
  }
}

impl DocumentInterface for Document {
  fn get_consequent_locations(&self) -> Vec<NodeLocation> {
    Vec::new()
  }

  fn get_api_model(&self) -> Result<models::ApiContainer, documents::DocumentError> {
    todo!()
  }
}
