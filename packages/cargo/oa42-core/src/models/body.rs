use crate::utils::NodeLocation;
use std::rc;
use wasm_bindgen::prelude::*;

#[derive(Clone)]
pub struct Body {
  pub location: NodeLocation,
  pub content_type: String,
  pub schema_id: Option<NodeLocation>,
  pub mockable: bool,
}

#[derive(Clone)]
#[wasm_bindgen]
pub struct BodyContainer(rc::Rc<Body>);

#[wasm_bindgen]
impl BodyContainer {
  #[wasm_bindgen(getter = location)]
  pub fn location(&self) -> String {
    self.0.location.to_string()
  }

  #[wasm_bindgen(getter = contentType)]
  pub fn content_type(&self) -> String {
    self.0.content_type.clone()
  }

  #[wasm_bindgen(getter = schemaId)]
  pub fn schema_id(&self) -> Option<String> {
    Some(self.0.schema_id.as_ref()?.to_string())
  }

  #[wasm_bindgen(getter = mockable)]
  pub fn mockable(&self) -> bool {
    self.0.mockable
  }
}

impl From<rc::Rc<Body>> for BodyContainer {
  fn from(interior: rc::Rc<Body>) -> Self {
    Self(interior)
  }
}
